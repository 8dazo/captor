import type {
  BudgetPolicy,
  CallPolicy,
  CaptarEvent,
  CaptarOptions,
  CaptarSession,
  Exporter,
  Metadata,
  ReserveFundsOptions,
  SessionPolicy,
  SessionSummary,
  TraceContext,
} from '@captar/types';
import { createId } from '@captar/utils';

import {
  BudgetEngine,
  type BudgetReconciliation,
  type SoftLimitCrossing,
} from './budget-engine.js';
import { PolicyViolationError } from './errors.js';
import type { EventBus } from './event-bus.js';
import type { HttpBatchExporter } from './exporter.js';
import { PolicyEngine } from './policy-engine.js';
import { createSpanSnapshot, updateSpanSnapshot } from './span.js';

type ExporterLike = Exporter | HttpBatchExporter;
type SessionLifecycleState = 'open' | 'closing' | 'closed';
type RuntimeCallbacks = Pick<
  CaptarOptions,
  'onBudgetExceeded' | 'onPolicyViolation'
>;

interface EmitOptions {
  spanId?: string;
  parentSpanId?: string;
  span?: CaptarEvent['span'];
}

export class RuntimeSession implements CaptarSession {
  readonly id = createId('session');
  readonly trace: TraceContext = {
    traceId: createId('trace'),
    spanId: createId('span'),
  };
  readonly policy: SessionPolicy | undefined;
  readonly policyEngine = new PolicyEngine();

  private readonly budgetEngine: BudgetEngine;
  private readonly summary: SessionSummary;
  private readonly telemetryErrors: unknown[] = [];
  private readonly callbackErrors: unknown[] = [];
  private readonly idleResolvers = new Set<() => void>();
  private readonly pendingSoftLimitCrossings: SoftLimitCrossing[] = [];
  private lifecycleState: SessionLifecycleState = 'open';
  private activeExecutionCount = 0;
  private activeRequestCount = 0;
  private closePromise?: Promise<SessionSummary>;
  private finalizationSession?: RuntimeSession;

  constructor(
    private readonly project: string,
    readonly budget: BudgetPolicy,
    readonly metadata: Metadata | undefined,
    policy: SessionPolicy | undefined,
    private readonly bus: EventBus,
    private readonly exporter: ExporterLike,
    private readonly callbacks: RuntimeCallbacks = {},
  ) {
    this.policy = {
      ...policy,
      budget: {
        ...policy?.budget,
        ...budget,
      },
    };
    this.budgetEngine = new BudgetEngine(budget);
    this.summary = {
      sessionId: this.id,
      startedAt: new Date().toISOString(),
      totalReservedUsd: 0,
      totalCommittedUsd: 0,
      totalReleasedUsd: 0,
      requestCount: 0,
      blockedCount: 0,
      toolCallCount: 0,
      metadata,
    };
  }

  async initialize(): Promise<void> {
    await this.emit(
      'session.started',
      {
        budget: this.budget,
        policy: this.policy,
      },
      {
        spanId: this.trace.spanId,
        span: createSpanSnapshot({
          id: this.trace.spanId,
          name: 'session',
          kind: 'session',
          startedAt: this.summary.startedAt,
          attributes: {
            sessionId: this.id,
          },
        }),
      },
    );
  }

  getState() {
    return this.budgetEngine.getState();
  }

  getSummary(): SessionSummary {
    const totals = this.budgetEngine.getTotals();
    return {
      ...this.summary,
      ...totals,
    };
  }

  /**
   * Return an internal view of this same session that exposes the protected
   * finalization reserve to wrapped LLM calls. The view shares all lifecycle,
   * counters, callbacks, trace identity, and budget state with the base session.
   */
  asFinalizationSession(): RuntimeSession {
    if (this.finalizationSession) return this.finalizationSession;

    const target = this;
    this.finalizationSession = new Proxy(this, {
      get(session, property) {
        if (property === 'budget') {
          return {
            ...target.budget,
            finalizationReserveUsd: 0,
          };
        }
        if (property === 'reserve') {
          return (amountUsd: number, options: ReserveFundsOptions = {}) =>
            target.reserve(amountUsd, {
              ...options,
              isFinal: true,
            });
        }

        const value = Reflect.get(session, property, session);
        return typeof value === 'function' ? value.bind(session) : value;
      },
    }) as RuntimeSession;
    return this.finalizationSession;
  }

  /**
   * Admit one logical request/tool execution before any lifecycle event is emitted.
   * Once close() starts, new leases are rejected while already-admitted work keeps
   * its lease until it has fully reconciled spend and emitted its terminal event.
   */
  acquireExecutionLease(): () => void {
    if (this.lifecycleState !== 'open') {
      throw new PolicyViolationError(
        `Session ${this.id} is ${this.lifecycleState} and cannot accept new execution.`,
      );
    }

    this.activeExecutionCount += 1;
    let released = false;

    return () => {
      if (released) return;
      released = true;
      this.activeExecutionCount = Math.max(0, this.activeExecutionCount - 1);
      if (this.activeExecutionCount === 0) {
        for (const resolve of this.idleResolvers) {
          resolve();
        }
        this.idleResolvers.clear();
      }
    };
  }

  acquireRequestSlot(policy?: CallPolicy): () => void {
    const maxCallsPerSession = policy?.maxCallsPerSession;
    if (
      typeof maxCallsPerSession === 'number' &&
      this.summary.requestCount >= maxCallsPerSession
    ) {
      throw new PolicyViolationError(
        `Session exceeded maxCallsPerSession=${maxCallsPerSession}.`,
      );
    }

    const maxConcurrentCalls = policy?.maxConcurrentCalls;
    if (
      typeof maxConcurrentCalls === 'number' &&
      this.activeRequestCount >= maxConcurrentCalls
    ) {
      throw new PolicyViolationError(
        `Session exceeded maxConcurrentCalls=${maxConcurrentCalls}.`,
      );
    }

    this.summary.requestCount += 1;
    this.activeRequestCount += 1;
    let released = false;

    return () => {
      if (released) return;
      released = true;
      this.activeRequestCount = Math.max(0, this.activeRequestCount - 1);
    };
  }

  markRequest(blocked = false): void {
    if (blocked) {
      this.summary.blockedCount += 1;
      return;
    }
    this.summary.requestCount += 1;
  }

  markToolCall(): void {
    this.summary.toolCallCount += 1;
  }

  notifyBudgetExceeded(attemptedUsd: number): void {
    const callback = this.callbacks.onBudgetExceeded;
    if (!callback) return;

    try {
      callback({
        sessionId: this.id,
        budgetUsd: this.budget.maxSpendUsd ?? this.getSummary().totalReservedUsd,
        attemptedUsd,
      });
    } catch (error) {
      this.callbackErrors.push(error);
    }
  }

  notifyPolicyViolation(reason: string, type = 'blocked'): void {
    const callback = this.callbacks.onPolicyViolation;
    if (!callback) return;

    try {
      callback({
        sessionId: this.id,
        reason,
        type,
      });
    } catch (error) {
      this.callbackErrors.push(error);
    }
  }

  reserve(amountUsd: number, options: ReserveFundsOptions = {}): number {
    return this.budgetEngine.reserve(amountUsd, options);
  }

  commit(reservedUsd: number, actualUsd: number): BudgetReconciliation {
    const reconciliation = this.budgetEngine.commit(reservedUsd, actualUsd);
    if (reconciliation.softLimitCrossing) {
      this.pendingSoftLimitCrossings.push(reconciliation.softLimitCrossing);
    }
    return reconciliation;
  }

  async emit<TData extends Record<string, unknown>>(
    type: CaptarEvent['type'],
    data: TData,
    options: EmitOptions | string = {},
  ): Promise<void> {
    const normalizedOptions =
      typeof options === 'string' ? { parentSpanId: options } : options;
    const spanId =
      normalizedOptions.span?.id ??
      normalizedOptions.spanId ??
      createId('span');
    const parentSpanId =
      normalizedOptions.span?.parentId ?? normalizedOptions.parentSpanId;
    const event: CaptarEvent<TData> = {
      id: createId('evt'),
      type,
      timestamp: new Date().toISOString(),
      sessionId: this.id,
      trace: {
        traceId: this.trace.traceId,
        spanId,
        parentSpanId,
      },
      span: normalizedOptions.span
        ? {
            ...normalizedOptions.span,
            id: spanId,
            parentId: parentSpanId,
          }
        : undefined,
      project: this.project,
      metadata: this.metadata,
      data,
    };

    await this.bus.emit(event);

    try {
      if ('enqueue' in this.exporter && typeof this.exporter.enqueue === 'function') {
        await this.exporter.enqueue(event);
      } else {
        await this.exporter.export({
          project: this.project,
          events: [event],
        });
      }
    } catch (error) {
      // Telemetry delivery is best-effort during execution. Explicit flush/close
      // remains the boundary where a queued exporter may report delivery failure.
      this.telemetryErrors.push(error);
    }

    if (type === 'spend.committed') {
      const crossing = this.pendingSoftLimitCrossings.shift();
      if (crossing) {
        await this.emit(
          'guardrail.violation',
          {
            category: 'spend',
            softLimit: true,
            message: `Session committed spend reached the ${(crossing.softLimitPct * 100).toFixed(2)}% soft budget threshold.`,
            softLimitPct: crossing.softLimitPct,
            thresholdUsd: crossing.thresholdUsd,
            committedUsd: crossing.committedUsd,
          },
          normalizedOptions,
        );
      }
    }
  }

  getTelemetryErrors(): readonly unknown[] {
    return this.telemetryErrors;
  }

  getCallbackErrors(): readonly unknown[] {
    return this.callbackErrors;
  }

  private async waitForIdle(): Promise<void> {
    if (this.activeExecutionCount === 0) return;
    await new Promise<void>((resolve) => {
      this.idleResolvers.add(resolve);
    });
  }

  private async finishClose(): Promise<SessionSummary> {
    await this.waitForIdle();

    this.summary.closedAt = new Date().toISOString();
    await this.emit(
      'session.closed',
      this.getSummary() as unknown as Record<string, unknown>,
      {
        spanId: this.trace.spanId,
        span: updateSpanSnapshot(
          createSpanSnapshot({
            id: this.trace.spanId,
            name: 'session',
            kind: 'session',
            startedAt: this.summary.startedAt,
            attributes: {
              sessionId: this.id,
            },
          }),
          {
            status: 'completed',
            endedAt: this.summary.closedAt,
          },
        ),
      },
    );

    // Execution remains blocked even if the explicit exporter flush below fails.
    this.lifecycleState = 'closed';
    if ('flush' in this.exporter && this.exporter.flush) {
      await this.exporter.flush();
    }
    return this.getSummary();
  }

  async close(): Promise<SessionSummary> {
    if (this.lifecycleState === 'closed') {
      return this.getSummary();
    }
    if (this.closePromise) {
      return await this.closePromise;
    }

    this.lifecycleState = 'closing';
    this.closePromise = this.finishClose();
    return await this.closePromise;
  }
}

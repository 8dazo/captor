import type {
  BudgetPolicy,
  CaptarEvent,
  CaptarSession,
  Metadata,
  ReserveFundsOptions,
  SessionPolicy,
  SessionSummary,
  TraceContext,
} from "@captar/types";
import { createId } from "@captar/utils";

import type { EventBus } from "./event-bus.js";
import type { HttpBatchExporter, NoopExporter } from "./exporter.js";
import { BudgetEngine } from "./budget-engine.js";

type ExporterLike = HttpBatchExporter | NoopExporter;

export class RuntimeSession implements CaptarSession {
  readonly id = createId("session");
  readonly trace: TraceContext = {
    traceId: createId("trace"),
    spanId: createId("span"),
  };

  private readonly budgetEngine: BudgetEngine;
  private readonly summary: SessionSummary;
  private closed = false;

  constructor(
    private readonly project: string,
    readonly budget: BudgetPolicy,
    readonly metadata: Metadata | undefined,
    readonly policy: SessionPolicy | undefined,
    private readonly bus: EventBus,
    private readonly exporter: ExporterLike,
  ) {
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
    await this.emit("session.started", {
      budget: this.budget,
      policy: this.policy,
    });
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

  markRequest(blocked = false): void {
    this.summary.requestCount += 1;
    if (blocked) {
      this.summary.blockedCount += 1;
    }
  }

  markToolCall(): void {
    this.summary.toolCallCount += 1;
  }

  reserve(amountUsd: number, options: ReserveFundsOptions = {}): number {
    return this.budgetEngine.reserve(amountUsd, options);
  }

  commit(reservedUsd: number, actualUsd: number): { releasedUsd: number; actualUsd: number } {
    return this.budgetEngine.commit(reservedUsd, actualUsd);
  }

  async emit<TData extends Record<string, unknown>>(
    type: CaptarEvent["type"],
    data: TData,
    parentSpanId?: string,
  ): Promise<void> {
    const event: CaptarEvent<TData> = {
      id: createId("evt"),
      type,
      timestamp: new Date().toISOString(),
      sessionId: this.id,
      trace: {
        traceId: this.trace.traceId,
        spanId: createId("span"),
        parentSpanId,
      },
      project: this.project,
      metadata: this.metadata,
      data,
    };

    await this.bus.emit(event);
    if ("enqueue" in this.exporter) {
      await this.exporter.enqueue(event);
    } else {
      await this.exporter.export({
        project: this.project,
        events: [event],
      });
    }
  }

  async close(): Promise<SessionSummary> {
    if (this.closed) {
      return this.getSummary();
    }

    this.closed = true;
    this.summary.closedAt = new Date().toISOString();
    await this.emit(
      "session.closed",
      this.getSummary() as unknown as Record<string, unknown>,
      this.trace.spanId,
    );
    if ("flush" in this.exporter && this.exporter.flush) {
      await this.exporter.flush();
    }
    return this.getSummary();
  }
}

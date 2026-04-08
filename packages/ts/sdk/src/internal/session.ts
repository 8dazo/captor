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
import { createSpanSnapshot, updateSpanSnapshot } from "./span.js";

type ExporterLike = HttpBatchExporter | NoopExporter;

interface EmitOptions {
  spanId?: string;
  parentSpanId?: string;
  span?: CaptarEvent["span"];
}

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
    }, {
      spanId: this.trace.spanId,
      span: createSpanSnapshot({
        id: this.trace.spanId,
        name: "session",
        kind: "session",
        startedAt: this.summary.startedAt,
        attributes: {
          sessionId: this.id,
        },
      }),
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
    if (blocked) {
      this.summary.blockedCount += 1;
      return;
    }
    this.summary.requestCount += 1;
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
    options: EmitOptions | string = {},
  ): Promise<void> {
    const normalizedOptions =
      typeof options === "string" ? { parentSpanId: options } : options;
    const spanId =
      normalizedOptions.span?.id ??
      normalizedOptions.spanId ??
      createId("span");
    const parentSpanId =
      normalizedOptions.span?.parentId ?? normalizedOptions.parentSpanId;
    const event: CaptarEvent<TData> = {
      id: createId("evt"),
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
      {
        spanId: this.trace.spanId,
        span: updateSpanSnapshot(
          createSpanSnapshot({
            id: this.trace.spanId,
            name: "session",
            kind: "session",
            startedAt: this.summary.startedAt,
            attributes: {
              sessionId: this.id,
            },
          }),
          {
            status: "completed",
            endedAt: this.summary.closedAt,
          },
        ),
      },
    );
    if ("flush" in this.exporter && this.exporter.flush) {
      await this.exporter.flush();
    }
    return this.getSummary();
  }
}

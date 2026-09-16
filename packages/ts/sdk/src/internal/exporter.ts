import type {
  CaptarEvent,
  ExportBatch,
  ExportResult,
  Exporter,
  HttpExporterOptions,
} from "@captar/types";

function serializeBatch(batch: ExportBatch): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(batch, (_key, value: unknown) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (typeof value === "function" || typeof value === "symbol") {
      return undefined;
    }
    if (value && typeof value === "object") {
      if (seen.has(value)) {
        return "[Circular]";
      }
      seen.add(value);
    }
    return value;
  });
}

export class NoopExporter implements Exporter {
  async export(batch: ExportBatch): Promise<ExportResult> {
    return {
      accepted: batch.events.length,
      retryable: false,
    };
  }
}

export class HttpBatchExporter implements Exporter {
  private readonly queue: CaptarEvent[] = [];
  private lastError: Error | undefined;

  constructor(
    private readonly options: HttpExporterOptions,
    private readonly project?: string,
    private readonly hookId?: string,
  ) {}

  async enqueue(event: CaptarEvent): Promise<void> {
    this.queue.push(event);
    const batchSize = this.options.batchSize ?? 25;
    if (this.queue.length >= batchSize) {
      await this.flush({ throwOnError: false });
    }
  }

  async export(batch: ExportBatch): Promise<ExportResult> {
    const response = await fetch(this.options.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(this.options.apiKey
          ? { authorization: `Bearer ${this.options.apiKey}` }
          : {}),
        ...this.options.headers,
      },
      body: serializeBatch(batch),
    });

    if (!response.ok) {
      return {
        accepted: 0,
        retryable: response.status >= 500,
      };
    }

    return (await response.json()) as ExportResult;
  }

  async flush(options: { throwOnError?: boolean } = { throwOnError: true }): Promise<void> {
    if (this.queue.length === 0) {
      if (options.throwOnError !== false && this.lastError) {
        throw this.lastError;
      }
      return;
    }

    const batch = this.queue.splice(0, this.queue.length);
    try {
      const result = await this.export({
        project: this.project,
        hookId: this.hookId,
        events: batch,
      });

      if (result.accepted < batch.length) {
        const status = result.retryable ? "retryable" : "non-retryable";
        throw new Error(
          `Captar telemetry export was rejected (${status}); accepted ${result.accepted}/${batch.length} events.`,
        );
      }

      this.lastError = undefined;
    } catch (error) {
      // Restore the batch at the front in original order before reporting or
      // swallowing the delivery failure. Auto-flush is best-effort; explicit
      // flush remains the delivery-confirmation boundary.
      this.queue.unshift(...batch);
      this.lastError = error instanceof Error ? error : new Error(String(error));
      if (options.throwOnError !== false) {
        throw this.lastError;
      }
    }
  }

  getPendingEventCount(): number {
    return this.queue.length;
  }

  getLastError(): Error | undefined {
    return this.lastError;
  }
}

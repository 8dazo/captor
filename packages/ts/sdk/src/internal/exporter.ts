import type {
  CaptarEvent,
  ExportBatch,
  ExportResult,
  Exporter,
  HttpExporterOptions,
} from "@captar/types";

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

  constructor(
    private readonly options: HttpExporterOptions,
    private readonly project?: string,
  ) {}

  async enqueue(event: CaptarEvent): Promise<void> {
    this.queue.push(event);
    const batchSize = this.options.batchSize ?? 25;
    if (this.queue.length >= batchSize) {
      await this.flush();
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
      body: JSON.stringify(batch),
    });

    if (!response.ok) {
      return {
        accepted: 0,
        retryable: response.status >= 500,
      };
    }

    return (await response.json()) as ExportResult;
  }

  async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, this.queue.length);
    const result = await this.export({
      project: this.project,
      events: batch,
    });

    if (result.retryable) {
      this.queue.unshift(...batch);
    }
  }
}

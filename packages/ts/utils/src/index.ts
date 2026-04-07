export function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

export function sumUsd(...values: number[]): number {
  return roundUsd(values.reduce((total, value) => total + value, 0));
}

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${random}`;
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(
    ([left], [right]) => left.localeCompare(right),
  );

  return `{${entries
    .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
    .join(",")}}`;
}

export function fingerprintRequest(value: unknown): string {
  const serialized = stableStringify(value);
  let hash = 0;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = (hash * 31 + serialized.charCodeAt(index)) >>> 0;
  }
  return `fp_${hash.toString(16)}`;
}

export class RepetitionTracker {
  private readonly counts = new Map<string, number>();

  record(fingerprint: string): number {
    const next = (this.counts.get(fingerprint) ?? 0) + 1;
    this.counts.set(fingerprint, next);
    return next;
  }
}

export async function withTimeout<T>(
  work: Promise<T>,
  timeoutMs?: number,
): Promise<T> {
  if (!timeoutMs) {
    return work;
  }

  return await Promise.race([
    work,
    new Promise<T>((_, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      timeout.unref?.();
    }),
  ]);
}

export function estimateTokensFromText(value: unknown): number {
  const serialized =
    typeof value === "string" ? value : JSON.stringify(value ?? "");
  return Math.max(1, Math.ceil(serialized.length / 4));
}

export function resolveRetryCount(request: Record<string, unknown>): number {
  const raw =
    request.maxRetries ??
    request.max_retries ??
    request.retryCount ??
    request.retry_count;

  return typeof raw === "number" ? raw : 0;
}

export function aggregateStreamUsage(
  usageChunks: Array<Partial<Record<string, number>>>,
): {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
} {
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedInputTokens = 0;

  for (const chunk of usageChunks) {
    inputTokens += chunk.input_tokens ?? chunk.prompt_tokens ?? 0;
    outputTokens += chunk.output_tokens ?? chunk.completion_tokens ?? 0;
    cachedInputTokens += chunk.cached_input_tokens ?? 0;
  }

  const result: {
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
  } = {};

  if (inputTokens) {
    result.inputTokens = inputTokens;
  }
  if (outputTokens) {
    result.outputTokens = outputTokens;
  }
  if (cachedInputTokens) {
    result.cachedInputTokens = cachedInputTokens;
  }

  return result;
}

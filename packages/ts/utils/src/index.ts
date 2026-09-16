const PICO_USD_DECIMALS = 12;
const PICO_USD_SCALE = 10n ** BigInt(PICO_USD_DECIMALS);
const EXPONENTIAL_SIGNIFICANT_DECIMALS = 15;

export function roundUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000;
}

export function sumUsd(...values: number[]): number {
  return roundUsd(values.reduce((total, value) => total + value, 0));
}

/**
 * Convert a finite USD number to an integer pico-USD value (1e-12 USD).
 *
 * The conversion uses the decimal scientific representation of the incoming
 * number rather than multiplying it by 1e12 as a Number first. That avoids
 * overflowing Number's safe-integer range for otherwise ordinary USD budgets.
 */
export function usdToPicoUsd(value: number): bigint {
  if (!Number.isFinite(value)) {
    throw new RangeError('USD value must be finite before fixed-point conversion.');
  }

  const negative = value < 0;
  const absolute = Math.abs(value);
  const [mantissa, exponentText] = absolute
    .toExponential(EXPONENTIAL_SIGNIFICANT_DECIMALS)
    .split('e');
  const exponent = Number(exponentText);
  const digits = BigInt(mantissa.replace('.', ''));
  const power = exponent - EXPONENTIAL_SIGNIFICANT_DECIMALS + PICO_USD_DECIMALS;

  let scaled: bigint;
  if (power >= 0) {
    scaled = digits * 10n ** BigInt(power);
  } else {
    const divisor = 10n ** BigInt(-power);
    scaled = (digits + divisor / 2n) / divisor;
  }

  return negative ? -scaled : scaled;
}

export function picoUsdToUsd(value: bigint): number {
  return Number(value) / Number(PICO_USD_SCALE);
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
  costUsd?: number;
} {
  let inputTokens = 0;
  let outputTokens = 0;
  let cachedInputTokens = 0;
  let costUsd: number | undefined;

  for (const chunk of usageChunks) {
    inputTokens += chunk.input_tokens ?? chunk.prompt_tokens ?? 0;
    outputTokens += chunk.output_tokens ?? chunk.completion_tokens ?? 0;
    cachedInputTokens += chunk.cached_input_tokens ?? 0;
    if (typeof chunk.cost === "number") {
      costUsd = chunk.cost;
    }
  }

  const result: {
    inputTokens?: number;
    outputTokens?: number;
    cachedInputTokens?: number;
    costUsd?: number;
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
  if (typeof costUsd === "number") {
    result.costUsd = costUsd;
  }

  return result;
}

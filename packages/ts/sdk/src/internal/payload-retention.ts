import type { CaptarEvent, PayloadRetentionMode } from '@captar/types';

const REDACTED_VALUE = '[REDACTED]';
const CIRCULAR_VALUE = '[REDACTED:CIRCULAR]';

export function normalizePayloadRetention(value: unknown): PayloadRetentionMode {
  if (typeof value !== 'string') {
    throw new RangeError('Control-plane payloadRetention must be redacted, raw, or none.');
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'redacted' || normalized === 'raw' || normalized === 'none') {
    return normalized;
  }

  throw new RangeError(
    `Unsupported control-plane payloadRetention "${value}"; expected redacted, raw, or none.`,
  );
}

function redactPayloadValue(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    if (seen.has(value)) return CIRCULAR_VALUE;
    seen.add(value);
    const result = value.map((item) => redactPayloadValue(item, seen));
    seen.delete(value);
    return result;
  }

  if (typeof value === 'object') {
    const object = value as Record<string, unknown>;
    if (seen.has(object)) return CIRCULAR_VALUE;
    seen.add(object);

    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(object)) {
      result[key] = redactPayloadValue(entry, seen);
    }

    seen.delete(object);
    return result;
  }

  return REDACTED_VALUE;
}

function minimizePayloadField(
  data: Record<string, unknown>,
  field: 'request' | 'response',
  retention: PayloadRetentionMode,
): Record<string, unknown> {
  if (!(field in data) || retention === 'raw') return data;

  const minimized = { ...data };
  if (retention === 'none') {
    delete minimized[field];
    return minimized;
  }

  minimized[field] = redactPayloadValue(data[field], new WeakSet<object>());
  return minimized;
}

/**
 * Minimize only user/provider payload bodies. Enforcement metadata, model IDs,
 * token usage, spend, policy decisions and trace/session identifiers remain
 * available regardless of payload retention mode.
 */
export function minimizeEventData<TData extends Record<string, unknown>>(
  type: CaptarEvent['type'],
  data: TData,
  retention: PayloadRetentionMode,
): TData {
  if (retention === 'raw') return data;

  if (type === 'request.started') {
    return minimizePayloadField(data, 'request', retention) as TData;
  }

  if (type === 'provider.response') {
    return minimizePayloadField(data, 'response', retention) as TData;
  }

  return data;
}

import { z } from 'zod';

export const receiptStatuses = ['running', 'succeeded', 'failed', 'aborted'] as const;
export const MAX_RECEIPT_BYTES = 512 * 1024;
const number = z.number().finite();
const amount = number.nonnegative();
const text = z.string().min(1).max(500);
const timestamp = z.string().datetime({ offset: true });

// The SDK's ExecutionReceipt shape; no invented contract or lineage fields.
export const receiptSchema = z
  .object({
    id: text,
    name: text,
    status: z.enum(receiptStatuses),
    startedAt: timestamp,
    endedAt: timestamp.optional(),
    resources: z.record(
      z
        .object({
          limit: amount.optional(),
          committed: amount,
          reserved: amount,
        })
        .passthrough()
    ),
    metrics: z.record(number),
    checkpoints: z.record(z.unknown()),
    violations: z
      .array(
        z
          .object({
            kind: z.enum(['resource-limit', 'deadline', 'outcome', 'invalid-operation']),
            message: z.string().max(10000),
            resource: text.optional(),
            metric: text.optional(),
            limit: number.optional(),
            actual: number.optional(),
          })
          .passthrough()
      )
      .max(1000),
  })
  .passthrough()
  .superRefine((receipt, ctx) => {
    if (receipt.endedAt && Date.parse(receipt.endedAt) < Date.parse(receipt.startedAt)) {
      ctx.addIssue({ code: 'custom', message: 'End time precedes start time.' });
    }
    if ((receipt.status === 'running') === Boolean(receipt.endedAt)) {
      ctx.addIssue({ code: 'custom', message: 'Status and end time disagree.' });
    }
  });

export type Receipt = z.infer<typeof receiptSchema>;

export function parseReceiptFile(source: string): Receipt[] {
  if (new TextEncoder().encode(source).length > MAX_RECEIPT_BYTES) {
    throw new Error('Receipt files must be 512 KB or smaller.');
  }
  let values: unknown[];
  try {
    const json: unknown = JSON.parse(source);
    values = Array.isArray(json) ? json : [json];
  } catch {
    try {
      values = source
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line));
    } catch {
      throw new Error('Choose a valid receipt JSON or JSONL file.');
    }
  }
  if (!values.length || values.length > 200)
    throw new Error('Import between 1 and 200 receipts at a time.');
  const receipts = values.map((value, index) => {
    const parsed = receiptSchema.safeParse(value);
    if (!parsed.success)
      throw new Error(`Receipt ${index + 1} does not match the Captor execution receipt format.`);
    return parsed.data;
  });
  // JSONL stores append snapshots; the last entry for an ID is authoritative in that file.
  return [...new Map(receipts.map((receipt) => [receipt.id, receipt])).values()];
}

export function resourceCapacity(usage: Receipt['resources'][string]) {
  const held = usage.committed + usage.reserved;
  return {
    held,
    remaining: usage.limit === undefined ? undefined : Math.max(0, usage.limit - held),
    exceeded: usage.limit !== undefined && held > usage.limit,
    percent:
      usage.limit === undefined
        ? undefined
        : usage.limit === 0
          ? held > 0
            ? 100
            : 0
          : Math.min(100, (held / usage.limit) * 100),
  };
}

export function receiptDuration(receipt: Pick<Receipt, 'startedAt' | 'endedAt'>) {
  if (!receipt.endedAt) return 'In progress at capture';
  const ms = Date.parse(receipt.endedAt) - Date.parse(receipt.startedAt);
  return ms < 1000
    ? `${ms} ms`
    : `${(ms / 1000).toLocaleString('en-US', { maximumFractionDigits: 2 })} s`;
}

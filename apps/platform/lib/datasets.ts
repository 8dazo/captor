import type {
  DatasetFileFormat,
  DatasetRowRecord,
  DatasetRowSource,
  JsonObject,
  JsonValue,
  TraceDatasetExportInput,
} from "@captar/types";

const datasetFormatSet = new Set<DatasetFileFormat>(["json", "jsonl", "csv"]);
const datasetSourceKindSet = new Set<DatasetRowSource["kind"]>([
  "trace_export",
  "file_import",
]);
const payloadRetentionSet = new Set<NonNullable<DatasetRowSource["inputRetentionMode"]>>([
  "redacted",
  "raw",
  "none",
]);

const csvHeaders = [
  "input",
  "output",
  "metadata",
  "sourceKind",
  "traceId",
  "externalTraceId",
  "spanId",
  "inputRetentionMode",
  "outputRetentionMode",
  "importedFormat",
] as const;

export function normalizeDatasetRowsFromText(
  content: string,
  format: DatasetFileFormat,
): DatasetRowRecord[] {
  switch (format) {
    case "json":
      return normalizeJsonDatasetRows(content, format);
    case "jsonl":
      return normalizeJsonlDatasetRows(content, format);
    case "csv":
      return normalizeCsvDatasetRows(content);
    default:
      throw new Error(`Unsupported dataset format: ${String(format)}`);
  }
}

export function serializeDatasetRowsToText(
  rows: DatasetRowRecord[],
  format: DatasetFileFormat,
): string {
  switch (format) {
    case "json":
      return `${JSON.stringify(rows, null, 2)}\n`;
    case "jsonl":
      return rows.map((row) => JSON.stringify(row)).join("\n");
    case "csv":
      return serializeDatasetRowsToCsv(rows);
    default:
      throw new Error(`Unsupported dataset format: ${String(format)}`);
  }
}

export function buildTraceDatasetRow(input: TraceDatasetExportInput): DatasetRowRecord {
  return {
    input: input.prompt ?? null,
    output: input.response ?? null,
    metadata: input.metadata,
    source: {
      kind: "trace_export",
      traceId: input.traceId,
      externalTraceId: input.externalTraceId,
      spanId: input.spanId,
      inputRetentionMode: input.promptRetentionMode,
      outputRetentionMode: input.responseRetentionMode,
    },
  };
}

function normalizeJsonDatasetRows(
  content: string,
  format: DatasetFileFormat,
): DatasetRowRecord[] {
  const parsed = JSON.parse(content) as unknown;
  const rows =
    isPlainObject(parsed) && Array.isArray(parsed.rows) ? parsed.rows : Array.isArray(parsed) ? parsed : [parsed];

  return rows.map((row) =>
    normalizeDatasetRowRecord(row, {
      kind: "file_import",
      importedFormat: format,
    }),
  );
}

function normalizeJsonlDatasetRows(
  content: string,
  format: DatasetFileFormat,
): DatasetRowRecord[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) =>
    normalizeDatasetRowRecord(JSON.parse(line), {
      kind: "file_import",
      importedFormat: format,
    }),
  );
}

function normalizeCsvDatasetRows(content: string): DatasetRowRecord[] {
  const rows = parseCsv(content);
  if (!rows.length) {
    return [];
  }

  const headerRow = rows[0] ?? [];
  const dataRows = rows.slice(1);
  const headers = headerRow.map((header) => header.trim());

  return dataRows
    .filter((row) => row.some((cell) => cell.trim().length > 0))
    .map((row) => {
      const cells = Object.fromEntries(
        headers.map((header, index) => [header, row[index] ?? ""]),
      );

      const extraMetadata = normalizeJsonObject(
        Object.fromEntries(
          Object.entries(cells)
            .filter(
              ([key, value]) =>
                !csvHeaders.includes(key as (typeof csvHeaders)[number]) &&
                value.trim(),
            )
            .map(([key, value]) => [key, parseCsvValue(value)]),
        ),
      );

      const metadata = mergeJsonObjects(
        normalizeMetadata(
          cells.metadata?.trim().length ? parseCsvValue(cells.metadata) : undefined,
        ),
        extraMetadata,
      );

      const source = normalizeDatasetSource({
        kind: cells.sourceKind || undefined,
        traceId: cells.traceId || undefined,
        externalTraceId: cells.externalTraceId || undefined,
        spanId: cells.spanId || undefined,
        inputRetentionMode: cells.inputRetentionMode || undefined,
        outputRetentionMode: cells.outputRetentionMode || undefined,
        importedFormat: cells.importedFormat || undefined,
      });

      return {
        input:
          "input" in cells ? parseCsvValue(cells.input) : normalizeJsonObject(cells),
        output:
          "output" in cells && cells.output.trim().length > 0
            ? parseCsvValue(cells.output)
            : undefined,
        metadata,
        source: source ?? {
          kind: "file_import",
          importedFormat: "csv",
        },
      };
    });
}

function normalizeDatasetRowRecord(
  value: unknown,
  defaultSource?: DatasetRowSource,
): DatasetRowRecord {
  if (!isPlainObject(value)) {
    return {
      input: normalizeJsonValue(value),
      source: defaultSource,
    };
  }

  const explicitShape =
    "input" in value ||
    "output" in value ||
    "metadata" in value ||
    "source" in value;

  if (!explicitShape) {
    return {
      input: normalizeJsonObject(value),
      source: defaultSource,
    };
  }

  const extraMetadata = normalizeJsonObject(
    Object.fromEntries(
      Object.entries(value).filter(
        ([key, entryValue]) =>
          !["input", "output", "metadata", "source"].includes(key) &&
          entryValue !== undefined,
      ),
    ),
  );

  return {
    input: normalizeJsonValue("input" in value ? value.input : null),
    output:
      "output" in value ? normalizeJsonValue(value.output ?? null) : undefined,
    metadata: mergeJsonObjects(
      normalizeMetadata(value.metadata),
      extraMetadata,
    ),
    source: normalizeDatasetSource(value.source) ?? defaultSource,
  };
}

function normalizeMetadata(value: unknown): JsonObject | undefined {
  if (value == null) {
    return undefined;
  }

  if (isPlainObject(value)) {
    return normalizeJsonObject(value);
  }

  return {
    value: normalizeJsonValue(value),
  };
}

function normalizeDatasetSource(value: unknown): DatasetRowSource | undefined {
  if (!isPlainObject(value)) {
    return undefined;
  }

  const kind = datasetSourceKindSet.has(
    value.kind as DatasetRowSource["kind"],
  )
    ? (value.kind as DatasetRowSource["kind"])
    : undefined;

  const importedFormat = datasetFormatSet.has(
    value.importedFormat as DatasetFileFormat,
  )
    ? (value.importedFormat as DatasetFileFormat)
    : undefined;

  const inputRetentionMode = payloadRetentionSet.has(
    value.inputRetentionMode as NonNullable<DatasetRowSource["inputRetentionMode"]>,
  )
    ? (value.inputRetentionMode as DatasetRowSource["inputRetentionMode"])
    : undefined;

  const outputRetentionMode = payloadRetentionSet.has(
    value.outputRetentionMode as NonNullable<DatasetRowSource["outputRetentionMode"]>,
  )
    ? (value.outputRetentionMode as DatasetRowSource["outputRetentionMode"])
    : undefined;

  if (!kind) {
    return undefined;
  }

  const source: DatasetRowSource = { kind };

  if (typeof value.traceId === "string") {
    source.traceId = value.traceId;
  }

  if (typeof value.externalTraceId === "string") {
    source.externalTraceId = value.externalTraceId;
  }

  if (typeof value.spanId === "string") {
    source.spanId = value.spanId;
  }

  if (inputRetentionMode) {
    source.inputRetentionMode = inputRetentionMode;
  }

  if (outputRetentionMode) {
    source.outputRetentionMode = outputRetentionMode;
  }

  if (importedFormat) {
    source.importedFormat = importedFormat;
  }

  return source;
}

function normalizeJsonValue(value: unknown): JsonValue {
  if (value == null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeJsonValue(entry));
  }

  if (isPlainObject(value)) {
    return normalizeJsonObject(value);
  }

  return String(value);
}

function normalizeJsonObject(value: Record<string, unknown>): JsonObject {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, normalizeJsonValue(entryValue)]),
  ) as JsonObject;
}

function mergeJsonObjects(
  left?: JsonObject,
  right?: JsonObject,
): JsonObject | undefined {
  if (!left && !right) {
    return undefined;
  }

  const merged = {
    ...(left ?? {}),
    ...(right ?? {}),
  };

  return Object.keys(merged).length ? merged : undefined;
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const next = content[index + 1];

    if (character === "\r") {
      continue;
    }

    if (inQuotes) {
      if (character === "\"") {
        if (next === "\"") {
          cell += "\"";
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === "\"") {
      inQuotes = true;
      continue;
    }

    if (character === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (character === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((rowValue) =>
    rowValue.some((cellValue) => cellValue.length > 0),
  );
}

function parseCsvValue(value: string): JsonValue {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed === "null") {
    return null;
  }

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return normalizeJsonValue(JSON.parse(trimmed));
    } catch {
      return value;
    }
  }

  return value;
}

function serializeDatasetRowsToCsv(rows: DatasetRowRecord[]): string {
  const lines = [
    csvHeaders.join(","),
    ...rows.map((row) =>
      csvHeaders
        .map((header) => escapeCsvCell(csvCellForHeader(row, header)))
        .join(","),
    ),
  ];

  return `${lines.join("\n")}\n`;
}

function csvCellForHeader(
  row: DatasetRowRecord,
  header: (typeof csvHeaders)[number],
): string {
  switch (header) {
    case "input":
      return jsonValueToCsvCell(row.input);
    case "output":
      return row.output === undefined ? "" : jsonValueToCsvCell(row.output);
    case "metadata":
      return row.metadata ? JSON.stringify(row.metadata) : "";
    case "sourceKind":
      return row.source?.kind ?? "";
    case "traceId":
      return row.source?.traceId ?? "";
    case "externalTraceId":
      return row.source?.externalTraceId ?? "";
    case "spanId":
      return row.source?.spanId ?? "";
    case "inputRetentionMode":
      return row.source?.inputRetentionMode ?? "";
    case "outputRetentionMode":
      return row.source?.outputRetentionMode ?? "";
    case "importedFormat":
      return row.source?.importedFormat ?? "";
    default:
      return "";
  }
}

function jsonValueToCsvCell(value: JsonValue): string {
  if (value == null) {
    return "null";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes("\"")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

import {
  DatasetSourceKind,
  HookStatus,
  LedgerKind,
  PayloadRetention,
  ProjectRole,
  TraceSpanKind,
  TraceSpanStatus,
  TraceStatus,
  Prisma,
} from "@prisma/client";
import type {
  DatasetFileFormat,
  DatasetRowRecord,
  DatasetRowSnapshot,
  DatasetSnapshot,
  ExportBatch,
  JsonObject,
  JsonValue,
  PayloadRetentionMode,
  TraceDatasetExportInput,
  TraceSpanSnapshot,
} from "@captar/types";

import {
  buildTraceDatasetRow,
  normalizeDatasetRowsFromText,
  serializeDatasetRowsToText,
} from "./datasets";
import { prisma } from "./db";
import { extractPromptContent, extractResponseContent, redactContent } from "./redaction";
import { summarizeTraceFromSpans } from "./trace-spans";
import { slugify } from "./utils";

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) {
    return 0;
  }
  return typeof value === "number" ? value : Number(value);
}

function jsonObjectOrUndefined(
  value: Record<string, unknown> | null | undefined,
): Prisma.JsonObject | undefined {
  if (!value) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as Prisma.JsonObject;
}

function nestedJsonValueToPrisma(value: JsonValue): Prisma.InputJsonValue | null {
  if (value === null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => nestedJsonValueToPrisma(entry)) as Prisma.InputJsonArray;
  }

  return Object.fromEntries(
    Object.entries(value)
      .flatMap(([key, entryValue]) =>
        entryValue === undefined
          ? []
          : [[key, nestedJsonValueToPrisma(entryValue)]],
      ),
  ) as Prisma.InputJsonObject;
}

function requiredJsonValueToPrisma(
  value: JsonValue,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null
    ? Prisma.JsonNull
    : (nestedJsonValueToPrisma(value) as Prisma.InputJsonValue);
}

function optionalJsonValueToPrisma(
  value: JsonValue | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requiredJsonValueToPrisma(value);
}

function jsonObjectToPrisma(
  value: JsonObject | undefined,
): Prisma.InputJsonObject | undefined {
  if (!value) {
    return undefined;
  }

  return nestedJsonValueToPrisma(value) as Prisma.InputJsonObject;
}

function toPayloadRetentionMode(
  retentionMode: PayloadRetention | null | undefined,
): PayloadRetentionMode | undefined {
  switch (retentionMode) {
    case PayloadRetention.RAW:
      return "raw";
    case PayloadRetention.NONE:
      return "none";
    case PayloadRetention.REDACTED:
      return "redacted";
    default:
      return undefined;
  }
}

function fromPayloadRetentionMode(
  retentionMode: PayloadRetentionMode | undefined,
): PayloadRetention | null {
  switch (retentionMode) {
    case "raw":
      return PayloadRetention.RAW;
    case "none":
      return PayloadRetention.NONE;
    case "redacted":
      return PayloadRetention.REDACTED;
    default:
      return null;
  }
}

function toDatasetSourceKind(
  kind: NonNullable<DatasetRowRecord["source"]>["kind"],
): DatasetSourceKind {
  switch (kind) {
    case "file_import":
      return DatasetSourceKind.FILE_IMPORT;
    case "trace_export":
    default:
      return DatasetSourceKind.TRACE_EXPORT;
  }
}

function fromDatasetSourceKind(
  kind: DatasetSourceKind,
): NonNullable<DatasetRowRecord["source"]>["kind"] {
  switch (kind) {
    case DatasetSourceKind.FILE_IMPORT:
      return "file_import";
    case DatasetSourceKind.TRACE_EXPORT:
    default:
      return "trace_export";
  }
}

function traceSpanToJson(span: TraceSpanSnapshot | undefined): Prisma.JsonObject | undefined {
  if (!span) {
    return undefined;
  }

  return jsonObjectOrUndefined({
    id: span.id,
    parentId: span.parentId ?? null,
    name: span.name,
    kind: span.kind,
    status: span.status,
    startedAt: span.startedAt,
    endedAt: span.endedAt ?? null,
    attributes: span.attributes ? jsonObjectOrUndefined(span.attributes) : undefined,
  });
}

function toTraceSpanKind(kind: string | undefined): TraceSpanKind {
  switch ((kind ?? "").toLowerCase()) {
    case "session":
      return TraceSpanKind.SESSION;
    case "tool":
      return TraceSpanKind.TOOL;
    case "request":
    default:
      return TraceSpanKind.REQUEST;
  }
}

function toTraceSpanStatus(status: string | undefined): TraceSpanStatus {
  switch ((status ?? "").toLowerCase()) {
    case "completed":
      return TraceSpanStatus.COMPLETED;
    case "blocked":
      return TraceSpanStatus.BLOCKED;
    case "failed":
      return TraceSpanStatus.FAILED;
    case "running":
    default:
      return TraceSpanStatus.RUNNING;
  }
}

function violationCategoryForEvent(
  eventType: string,
  data: Record<string, unknown>,
): string {
  if (typeof data.category === "string") {
    return data.category;
  }

  switch (eventType) {
    case "request.blocked":
      return "access";
    case "tool.blocked":
      return "workflow";
    case "request.failed":
    case "tool.failed":
      return "execution";
    default:
      return "workflow";
  }
}

function toDatasetSnapshot(dataset: {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  rowCount: number;
  createdAt: Date;
  updatedAt: Date;
}): DatasetSnapshot {
  return {
    id: dataset.id,
    projectId: dataset.projectId,
    name: dataset.name,
    description: dataset.description ?? undefined,
    rowCount: dataset.rowCount,
    createdAt: dataset.createdAt.toISOString(),
    updatedAt: dataset.updatedAt.toISOString(),
  };
}

function toDatasetRowSnapshot(row: {
  id: string;
  datasetId: string;
  position: number;
  input: Prisma.JsonValue;
  output: Prisma.JsonValue | null;
  metadata: Prisma.JsonValue | null;
  sourceKind: DatasetSourceKind;
  sourceTraceId: string | null;
  sourceExternalTraceId: string | null;
  sourceSpanId: string | null;
  inputRetentionMode: PayloadRetention | null;
  outputRetentionMode: PayloadRetention | null;
  createdAt: Date;
}): DatasetRowSnapshot {
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as JsonObject)
      : undefined;

  return {
    id: row.id,
    datasetId: row.datasetId,
    position: row.position,
    input: row.input as JsonValue,
    output: row.output === null ? undefined : (row.output as JsonValue),
    metadata,
    source: {
      kind: fromDatasetSourceKind(row.sourceKind),
      traceId: row.sourceTraceId ?? undefined,
      externalTraceId: row.sourceExternalTraceId ?? undefined,
      spanId: row.sourceSpanId ?? undefined,
      inputRetentionMode: toPayloadRetentionMode(row.inputRetentionMode),
      outputRetentionMode: toPayloadRetentionMode(row.outputRetentionMode),
    },
    createdAt: row.createdAt.toISOString(),
  };
}

function payloadSnapshotContent(payload: {
  retentionMode: PayloadRetention;
  contentRaw: string | null;
  contentRedacted: string | null;
} | null): string | null {
  if (!payload) {
    return null;
  }

  switch (payload.retentionMode) {
    case PayloadRetention.RAW:
      return payload.contentRaw ?? payload.contentRedacted ?? null;
    case PayloadRetention.REDACTED:
      return payload.contentRedacted ?? payload.contentRaw ?? null;
    case PayloadRetention.NONE:
    default:
      return null;
  }
}

function buildTraceDatasetExportInput(trace: {
  id: string;
  externalTraceId: string;
  requestId: string | null;
  provider: string | null;
  model: string | null;
  namespace: string | null;
  methodName: string | null;
  status: TraceStatus;
  metadata: Prisma.JsonValue | null;
  hook: { publicId: string; projectId: string };
  llmSession: { externalSessionId: string };
  promptPayload: {
    retentionMode: PayloadRetention;
    contentRaw: string | null;
    contentRedacted: string | null;
  } | null;
  responsePayload: {
    retentionMode: PayloadRetention;
    contentRaw: string | null;
    contentRedacted: string | null;
  } | null;
  spans: Array<{ externalSpanId: string; kind: TraceSpanKind }>;
}): TraceDatasetExportInput | null {
  const prompt = payloadSnapshotContent(trace.promptPayload);
  const response = payloadSnapshotContent(trace.responsePayload);

  if (prompt == null && response == null) {
    return null;
  }

  const traceMetadata =
    trace.metadata &&
    typeof trace.metadata === "object" &&
    !Array.isArray(trace.metadata)
      ? (trace.metadata as JsonObject)
      : undefined;
  const primarySpan =
    trace.spans.find((span) => span.kind === TraceSpanKind.REQUEST) ?? trace.spans[0];

  const metadata = Object.fromEntries(
    Object.entries({
      ...(traceMetadata ? { traceMetadata } : {}),
      requestId: trace.requestId ?? undefined,
      provider: trace.provider ?? undefined,
      model: trace.model ?? undefined,
      namespace: trace.namespace ?? undefined,
      methodName: trace.methodName ?? undefined,
      status: trace.status.toLowerCase(),
      hookId: trace.hook.publicId,
      sessionId: trace.llmSession.externalSessionId,
    }).filter(([, value]) => value !== undefined),
  ) as JsonObject;

  return {
    traceId: trace.id,
    externalTraceId: trace.externalTraceId,
    spanId: primarySpan?.externalSpanId,
    prompt,
    response,
    promptRetentionMode: toPayloadRetentionMode(trace.promptPayload?.retentionMode),
    responseRetentionMode: toPayloadRetentionMode(trace.responsePayload?.retentionMode),
    metadata: Object.keys(metadata).length ? metadata : undefined,
  };
}

async function upsertTraceSpanFromEvent(
  traceDbId: string,
  event: NonNullable<ExportBatch["events"]>[number],
  eventAlreadyExists: boolean,
) {
  if (!event.span) {
    return;
  }

  await prisma.traceSpan.upsert({
    where: {
      traceId_externalSpanId: {
        traceId: traceDbId,
        externalSpanId: event.span.id,
      },
    },
    update: {
      externalParentSpanId: event.span.parentId ?? null,
      name: event.span.name,
      kind: toTraceSpanKind(event.span.kind),
      status: toTraceSpanStatus(event.span.status),
      startedAt: new Date(event.span.startedAt),
      endedAt: event.span.endedAt ? new Date(event.span.endedAt) : null,
      attributes: event.span.attributes
        ? jsonObjectOrUndefined(event.span.attributes)
        : undefined,
      lastEventAt: new Date(event.timestamp),
      ...(eventAlreadyExists ? {} : { eventCount: { increment: 1 } }),
    },
    create: {
      traceId: traceDbId,
      externalSpanId: event.span.id,
      externalParentSpanId: event.span.parentId ?? null,
      name: event.span.name,
      kind: toTraceSpanKind(event.span.kind),
      status: toTraceSpanStatus(event.span.status),
      startedAt: new Date(event.span.startedAt),
      endedAt: event.span.endedAt ? new Date(event.span.endedAt) : null,
      attributes: event.span.attributes
        ? jsonObjectOrUndefined(event.span.attributes)
        : undefined,
      eventCount: 1,
      lastEventAt: new Date(event.timestamp),
    },
  });
}

async function syncTraceDerivedState(traceDbId: string) {
  const trace = await prisma.trace.findUnique({
    where: { id: traceDbId },
    include: {
      spans: {
        orderBy: { startedAt: "asc" },
      },
      spendEntries: true,
    },
  });

  if (!trace) {
    return;
  }

  const summary = summarizeTraceFromSpans(trace.spans, trace.spendEntries);

  await prisma.trace.update({
    where: { id: traceDbId },
    data: {
      status: summary.status,
      startedAt: summary.startedAt ?? trace.startedAt,
      completedAt: summary.status === TraceStatus.RUNNING ? null : summary.completedAt,
      estimatedCostUsd: summary.estimatedCostUsd,
      actualCostUsd: summary.actualCostUsd,
      inputTokens: summary.inputTokens > 0 ? summary.inputTokens : null,
      outputTokens: summary.outputTokens > 0 ? summary.outputTokens : null,
      cachedInputTokens:
        summary.cachedInputTokens > 0 ? summary.cachedInputTokens : null,
    },
  });
}

export async function listUserProjects(userId: string) {
  return prisma.project.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      hooks: {
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: {
          hooks: true,
          sessions: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function createProjectForUser(userId: string, name: string) {
  const baseSlug = slugify(name || "project");
  let slug = baseSlug || "project";
  let index = 1;

  while (await prisma.project.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${index}`;
    index += 1;
  }

  const project = await prisma.project.create({
    data: {
      slug,
      name,
      ownerId: userId,
      members: {
        create: {
          userId,
          role: ProjectRole.OWNER,
        },
      },
    },
  });

  return project;
}

function createHookPublicId(projectSlug: string, environment: string) {
  const random = Math.random().toString(36).slice(2, 8);
  return `hook_${projectSlug}_${environment}_${random}`;
}

export async function createHookConnection(
  projectId: string,
  input: {
    name: string;
    environment: string;
    payloadRetention?: PayloadRetention;
  },
) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
  });

  const hook = await prisma.hookConnection.create({
    data: {
      publicId: createHookPublicId(project.slug, input.environment),
      name: input.name,
      environment: input.environment,
      status: HookStatus.ACTIVE,
      ingestEnabled: true,
      syncPolicy: true,
      payloadRetention: input.payloadRetention ?? PayloadRetention.REDACTED,
      projectId,
      policies: {
        create: {
          version: 1,
          isActive: true,
          payloadRetention: input.payloadRetention ?? PayloadRetention.REDACTED,
          policyJson: {
            budget: {
              maxSpendUsd: 1,
              softLimitPct: 0.8,
              finalizationReserveUsd: 0.1,
              maxRepeatedCalls: 3,
            },
            call: {
              maxEstimatedCostUsd: 0.5,
              timeoutMs: 30_000,
              retriesCeiling: 1,
            },
            tool: {
              maxCallsPerSession: 10,
            },
          },
        },
      },
    },
    include: {
      policies: true,
    },
  });

  return hook;
}

export async function getProjectById(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      members: {
        some: {
          userId,
        },
      },
    },
    include: {
      hooks: {
        include: {
          policies: {
            where: { isActive: true },
            take: 1,
          },
          _count: {
            select: {
              llmSessions: true,
              traces: true,
              violations: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
      _count: {
        select: {
          hooks: true,
          sessions: true,
        },
      },
    },
  });
}

export async function getHookByPublicId(hookId: string, userId?: string) {
  return prisma.hookConnection.findFirst({
    where: {
      publicId: hookId,
      ...(userId
        ? {
            project: {
              members: {
                some: { userId },
              },
            },
          }
        : {}),
    },
    include: {
      project: true,
      policies: {
        orderBy: { version: "desc" },
      },
      llmSessions: {
        orderBy: { updatedAt: "desc" },
        take: 20,
      },
      traces: {
        orderBy: { startedAt: "desc" },
        take: 20,
        include: {
          promptPayload: true,
          responsePayload: true,
          events: {
            orderBy: { timestamp: "asc" },
            take: 50,
          },
        },
      },
      spendEntries: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      violations: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
}

export async function getTraceById(traceId: string, userId: string) {
  return prisma.trace.findFirst({
    where: {
      id: traceId,
      hook: {
        project: {
          members: {
            some: { userId },
          },
        },
      },
    },
    include: {
      hook: true,
      llmSession: true,
      promptPayload: true,
      responsePayload: true,
      spans: {
        orderBy: { startedAt: "asc" },
      },
      events: {
        orderBy: { timestamp: "asc" },
      },
      spendEntries: {
        orderBy: { createdAt: "asc" },
      },
      violations: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function listProjectDatasets(projectId: string, userId: string) {
  const datasets = await prisma.dataset.findMany({
    where: {
      projectId,
      project: {
        members: {
          some: { userId },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return datasets.map(toDatasetSnapshot);
}

export async function createProjectDataset(
  projectId: string,
  userId: string,
  input: {
    name: string;
    description?: string | null;
  },
) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      members: {
        some: { userId },
      },
    },
    select: { id: true },
  });

  if (!project) {
    return null;
  }

  const dataset = await prisma.dataset.create({
    data: {
      projectId: project.id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
    },
  });

  return toDatasetSnapshot(dataset);
}

export async function getProjectDatasetById(
  projectId: string,
  datasetId: string,
  userId: string,
) {
  const dataset = await prisma.dataset.findFirst({
    where: {
      id: datasetId,
      projectId,
      project: {
        members: {
          some: { userId },
        },
      },
    },
    include: {
      rows: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!dataset) {
    return null;
  }

  return {
    ...toDatasetSnapshot(dataset),
    rows: dataset.rows.map(toDatasetRowSnapshot),
  };
}

export async function appendDatasetRows(
  projectId: string,
  datasetId: string,
  userId: string,
  rows: DatasetRowRecord[],
) {
  if (!rows.length) {
    return null;
  }

  return prisma.$transaction(async (transaction) => {
    const dataset = await transaction.dataset.findFirst({
      where: {
        id: datasetId,
        projectId,
        project: {
          members: {
            some: { userId },
          },
        },
      },
    });

    if (!dataset) {
      return null;
    }

    const nextPosition = dataset.rowCount + 1;

    await transaction.datasetRow.createMany({
      data: rows.map((row, index) => ({
        datasetId: dataset.id,
        position: nextPosition + index,
        input: requiredJsonValueToPrisma(row.input),
        output: optionalJsonValueToPrisma(row.output),
        metadata: jsonObjectToPrisma(row.metadata),
        sourceKind: toDatasetSourceKind(row.source?.kind ?? "file_import"),
        sourceTraceId: row.source?.traceId ?? null,
        sourceExternalTraceId: row.source?.externalTraceId ?? null,
        sourceSpanId: row.source?.spanId ?? null,
        inputRetentionMode: fromPayloadRetentionMode(row.source?.inputRetentionMode),
        outputRetentionMode: fromPayloadRetentionMode(row.source?.outputRetentionMode),
      })),
    });

    const updated = await transaction.dataset.update({
      where: { id: dataset.id },
      data: {
        rowCount: {
          increment: rows.length,
        },
      },
    });

    return toDatasetSnapshot(updated);
  });
}

export async function importProjectDatasetRows(
  projectId: string,
  datasetId: string,
  userId: string,
  format: DatasetFileFormat,
  content: string,
) {
  const rows = normalizeDatasetRowsFromText(content, format);
  const dataset = await appendDatasetRows(projectId, datasetId, userId, rows);

  if (!dataset) {
    return null;
  }

  return {
    dataset,
    appendedCount: rows.length,
  };
}

export async function exportProjectDataset(
  projectId: string,
  datasetId: string,
  userId: string,
  format: DatasetFileFormat,
) {
  const dataset = await prisma.dataset.findFirst({
    where: {
      id: datasetId,
      projectId,
      project: {
        members: {
          some: { userId },
        },
      },
    },
    include: {
      rows: {
        orderBy: { position: "asc" },
      },
    },
  });

  if (!dataset) {
    return null;
  }

  const snapshots = dataset.rows.map(toDatasetRowSnapshot);
  return {
    dataset: toDatasetSnapshot(dataset),
    rows: snapshots,
    content: serializeDatasetRowsToText(snapshots, format),
    fileName: `${slugify(dataset.name || "dataset")}.${format}`,
  };
}

export async function appendTraceToDataset(
  projectId: string,
  datasetId: string,
  traceId: string,
  userId: string,
) {
  const trace = await prisma.trace.findFirst({
    where: {
      id: traceId,
      hook: {
        projectId,
        project: {
          members: {
            some: { userId },
          },
        },
      },
    },
    include: {
      hook: true,
      llmSession: true,
      promptPayload: true,
      responsePayload: true,
      spans: {
        orderBy: { startedAt: "asc" },
      },
    },
  });

  if (!trace) {
    return null;
  }

  const exportInput = buildTraceDatasetExportInput(trace);
  if (!exportInput) {
    return null;
  }

  const row = buildTraceDatasetRow(exportInput);
  const dataset = await appendDatasetRows(projectId, datasetId, userId, [row]);

  if (!dataset) {
    return null;
  }

  const insertedRow = await prisma.datasetRow.findFirst({
    where: {
      datasetId,
      position: dataset.rowCount,
    },
  });

  if (!insertedRow) {
    return null;
  }

  return {
    dataset,
    row: toDatasetRowSnapshot(insertedRow),
  };
}

function findOrCreateTraceState(
  state: Map<string, { traceDbId: string; sessionDbId: string }>,
  key: string,
  value: { traceDbId: string; sessionDbId: string },
) {
  if (!state.has(key)) {
    state.set(key, value);
  }
  return state.get(key)!;
}

export async function ingestHookBatch(hookId: string, batch: Partial<ExportBatch>) {
  const hook = await prisma.hookConnection.findUnique({
    where: { publicId: hookId },
    include: {
      project: true,
      policies: {
        where: { isActive: true },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!hook || !hook.ingestEnabled || hook.status === HookStatus.DISABLED) {
    throw new Error("Unknown or disabled hook.");
  }

  const activePolicy = hook.policies[0] ?? null;
  const traceState = new Map<string, { traceDbId: string; sessionDbId: string }>();
  const affectedTraceIds = new Set<string>();
  const orderedEvents = [...(batch.events ?? [])].sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  );

  for (const event of orderedEvents) {
    const session = await prisma.lLMSession.upsert({
      where: {
        externalSessionId: event.sessionId,
      },
      update: {
        hookId: hook.id,
        projectId: hook.projectId,
        metadata: event.metadata ? (event.metadata as Prisma.JsonObject) : undefined,
      },
      create: {
        externalSessionId: event.sessionId,
        hookId: hook.id,
        projectId: hook.projectId,
        startedAt: new Date(event.timestamp),
        metadata: event.metadata ? (event.metadata as Prisma.JsonObject) : undefined,
      },
    });

    const traceKey = event.trace.traceId;
    const traceStateItem = traceState.get(traceKey);
    let traceDbId = traceStateItem?.traceDbId;

    if (!traceDbId) {
      const trace = await prisma.trace.upsert({
        where: {
          hookId_externalTraceId: {
            hookId: hook.id,
            externalTraceId: traceKey,
          },
        },
        update: {
          llmSessionId: session.id,
          metadata: event.metadata ? (event.metadata as Prisma.JsonObject) : undefined,
        },
        create: {
          externalTraceId: traceKey,
          hookId: hook.id,
          llmSessionId: session.id,
          startedAt: new Date(event.timestamp),
          metadata: event.metadata ? (event.metadata as Prisma.JsonObject) : undefined,
        },
      });
      traceDbId = trace.id;
      findOrCreateTraceState(traceState, traceKey, {
        traceDbId,
        sessionDbId: session.id,
      });
    }
    affectedTraceIds.add(traceDbId);

    const existingTraceEvent = await prisma.traceEvent.findUnique({
      where: {
        traceDbId_externalEventId: {
          traceDbId,
          externalEventId: event.id,
        },
      },
      select: {
        id: true,
      },
    });

    await prisma.traceEvent.upsert({
      where: {
        traceDbId_externalEventId: {
          traceDbId,
          externalEventId: event.id,
        },
      },
      update: {
        type: event.type,
        timestamp: new Date(event.timestamp),
        data: event.data as Prisma.JsonObject,
        spanData: traceSpanToJson(event.span),
        metadata: event.metadata ? (event.metadata as Prisma.JsonObject) : undefined,
      },
      create: {
        traceDbId,
        externalEventId: event.id,
        type: event.type,
        timestamp: new Date(event.timestamp),
        data: event.data as Prisma.JsonObject,
        spanData: traceSpanToJson(event.span),
        metadata: event.metadata ? (event.metadata as Prisma.JsonObject) : undefined,
      },
    });
    await upsertTraceSpanFromEvent(traceDbId, event, Boolean(existingTraceEvent));

    if (event.type === "session.started") {
      await prisma.trace.update({
        where: { id: traceDbId },
        data: {
          startedAt: new Date(event.timestamp),
          status: TraceStatus.RUNNING,
          metadata: event.metadata ? (event.metadata as Prisma.JsonObject) : undefined,
        },
      });
    }

    if (event.type === "request.started") {
      const data = event.data as Record<string, unknown>;
      await prisma.trace.update({
        where: { id: traceDbId },
        data: {
          provider: String(data.provider ?? "unknown"),
          model: typeof data.model === "string" ? data.model : null,
          namespace: typeof data.namespace === "string" ? data.namespace : null,
          methodName: typeof data.methodName === "string" ? data.methodName : null,
          requestId: typeof data.requestId === "string" ? data.requestId : null,
          startedAt: new Date(event.timestamp),
          status: TraceStatus.RUNNING,
        },
      });

      const promptText = extractPromptContent(data);
      const redacted = redactContent(promptText, hook.payloadRetention);
      await prisma.promptPayload.upsert({
        where: { traceId: traceDbId },
        update: {
          retentionMode: hook.payloadRetention,
          contentRaw: redacted.raw,
          contentRedacted: redacted.redacted,
          metadata: { captured: Boolean(promptText), policyVersion: activePolicy?.version ?? null },
        },
        create: {
          traceId: traceDbId,
          retentionMode: hook.payloadRetention,
          contentRaw: redacted.raw,
          contentRedacted: redacted.redacted,
          metadata: { captured: Boolean(promptText), policyVersion: activePolicy?.version ?? null },
        },
      });
    }

    if (event.type === "provider.response") {
      const data = event.data as Record<string, unknown>;
      const responseText = extractResponseContent(data);
      const redacted = redactContent(responseText, hook.payloadRetention);

      await prisma.trace.update({
        where: { id: traceDbId },
        data: {
          provider: typeof data.provider === "string" ? data.provider : undefined,
          model: typeof data.model === "string" ? data.model : undefined,
        },
      });

      await prisma.responsePayload.upsert({
        where: { traceId: traceDbId },
        update: {
          retentionMode: hook.payloadRetention,
          contentRaw: redacted.raw,
          contentRedacted: redacted.redacted,
          metadata: { captured: Boolean(responseText), policyVersion: activePolicy?.version ?? null },
        },
        create: {
          traceId: traceDbId,
          retentionMode: hook.payloadRetention,
          contentRaw: redacted.raw,
          contentRedacted: redacted.redacted,
          metadata: { captured: Boolean(responseText), policyVersion: activePolicy?.version ?? null },
        },
      });
    }

    if (event.type === "estimate.reserved" || event.type === "spend.committed") {
      const data = event.data as Record<string, unknown>;
      if (event.type === "estimate.reserved" && typeof data.reservedUsd === "number") {
        await prisma.spendLedger.upsert({
          where: {
            hookId_sourceEventId_kind: {
              hookId: hook.id,
              sourceEventId: event.id,
              kind: LedgerKind.RESERVED,
            },
          },
          update: {
            amountUsd: data.reservedUsd,
            metadata: data as Prisma.JsonObject,
            llmSessionId: session.id,
            traceId: traceDbId,
          },
          create: {
            hookId: hook.id,
            llmSessionId: session.id,
            traceId: traceDbId,
            sourceEventId: event.id,
            kind: LedgerKind.RESERVED,
            amountUsd: data.reservedUsd,
            metadata: data as Prisma.JsonObject,
          },
        });
      }

      if (event.type === "spend.committed") {
        if (typeof data.actualCostUsd === "number") {
          await prisma.spendLedger.upsert({
            where: {
              hookId_sourceEventId_kind: {
                hookId: hook.id,
                sourceEventId: event.id,
                kind: LedgerKind.COMMITTED,
              },
            },
            update: {
              amountUsd: data.actualCostUsd,
              metadata: data as Prisma.JsonObject,
              llmSessionId: session.id,
              traceId: traceDbId,
            },
            create: {
              hookId: hook.id,
              llmSessionId: session.id,
              traceId: traceDbId,
              sourceEventId: event.id,
              kind: LedgerKind.COMMITTED,
              amountUsd: data.actualCostUsd,
              metadata: data as Prisma.JsonObject,
            },
          });
        }
        if (typeof data.releasedUsd === "number" && data.releasedUsd > 0) {
          await prisma.spendLedger.upsert({
            where: {
              hookId_sourceEventId_kind: {
                hookId: hook.id,
                sourceEventId: event.id,
                kind: LedgerKind.RELEASED,
              },
            },
            update: {
              amountUsd: data.releasedUsd,
              metadata: data as Prisma.JsonObject,
              llmSessionId: session.id,
              traceId: traceDbId,
            },
            create: {
              hookId: hook.id,
              llmSessionId: session.id,
              traceId: traceDbId,
              sourceEventId: event.id,
              kind: LedgerKind.RELEASED,
              amountUsd: data.releasedUsd,
              metadata: data as Prisma.JsonObject,
            },
          });
        }
      }
    }

    if (
      event.type === "request.blocked" ||
      event.type === "tool.blocked" ||
      event.type === "request.failed" ||
      event.type === "tool.failed" ||
      event.type === "guardrail.violation"
    ) {
      const data = event.data as Record<string, unknown>;
      await prisma.violation.upsert({
        where: {
          hookId_sourceEventId: {
            hookId: hook.id,
            sourceEventId: event.id,
          },
        },
        update: {
          llmSessionId: session.id,
          traceId: traceDbId,
          category: violationCategoryForEvent(event.type, data),
          eventType: event.type,
          message: String(data.reason ?? data.message ?? "Guardrail violation"),
          details: data as Prisma.JsonObject,
        },
        create: {
          hookId: hook.id,
          llmSessionId: session.id,
          traceId: traceDbId,
          sourceEventId: event.id,
          category: violationCategoryForEvent(event.type, data),
          eventType: event.type,
          message: String(data.reason ?? data.message ?? "Guardrail violation"),
          details: data as Prisma.JsonObject,
        },
      });
    }

    if (event.type === "session.closed") {
      const data = event.data as Record<string, unknown>;
      await prisma.lLMSession.update({
        where: { id: session.id },
        data: {
          closedAt: new Date(event.timestamp),
          totalReservedUsd:
            typeof data.totalReservedUsd === "number" ? data.totalReservedUsd : undefined,
          totalCommittedUsd:
            typeof data.totalCommittedUsd === "number" ? data.totalCommittedUsd : undefined,
          totalReleasedUsd:
            typeof data.totalReleasedUsd === "number" ? data.totalReleasedUsd : undefined,
          requestCount: typeof data.requestCount === "number" ? data.requestCount : undefined,
          blockedCount: typeof data.blockedCount === "number" ? data.blockedCount : undefined,
          toolCallCount: typeof data.toolCallCount === "number" ? data.toolCallCount : undefined,
        },
      });
    }
  }

  for (const traceDbId of affectedTraceIds) {
    await syncTraceDerivedState(traceDbId);
  }

  return {
    accepted: batch.events?.length ?? 0,
    hook,
  };
}

export function summarizeHookAnalytics(hook: Awaited<ReturnType<typeof getHookByPublicId>>) {
  if (!hook) {
    return null;
  }

  const committedUsd = hook.spendEntries
    .filter((entry) => entry.kind === LedgerKind.COMMITTED)
    .reduce((total, entry) => total + decimalToNumber(entry.amountUsd), 0);

  const topModels = Object.entries(
    hook.traces.reduce<Record<string, number>>((acc, trace) => {
      const key = trace.model ?? "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((left, right) => right[1] - left[1]);

  return {
    committedUsd,
    topModels,
    blockedCount: hook.violations.length,
    sessionCount: hook.llmSessions.length,
    traceCount: hook.traces.length,
  };
}

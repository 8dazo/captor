import bcrypt from "bcryptjs";
import {
  DatasetSourceKind,
  HookStatus,
  LedgerKind,
  ManualEvalRunStatus,
  ManualEvalVerdict,
  PayloadRetention,
  Prisma,
  PrismaClient,
  ProjectRole,
  TraceSpanKind,
  TraceSpanStatus,
  TraceStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

type DbClient = PrismaClient | Prisma.TransactionClient;
type JsonObject = Record<string, unknown>;
type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];

interface SeedPayload {
  retentionMode: PayloadRetention;
  contentRaw?: string;
  contentRedacted?: string;
  metadata?: JsonObject;
}

interface SeedTraceSpan {
  externalSpanId: string;
  externalParentSpanId?: string;
  name: string;
  kind: TraceSpanKind;
  status: TraceSpanStatus;
  startedAt: Date;
  endedAt?: Date;
  attributes?: JsonObject;
}

interface SeedTraceEvent {
  externalEventId: string;
  type: string;
  timestamp: Date;
  data: JsonObject;
  spanData?: JsonObject;
  metadata?: JsonObject;
}

interface SeedTraceLedgerEntry {
  kind: LedgerKind;
  amountUsd: number;
  sourceEventId?: string;
  createdAt: Date;
  metadata?: JsonObject;
}

interface SeedTraceViolation {
  category: string;
  eventType: string;
  message: string;
  sourceEventId?: string;
  createdAt: Date;
  details?: JsonObject;
}

interface SeedTraceInput {
  externalTraceId: string;
  requestId?: string;
  provider?: string;
  model?: string;
  namespace?: string;
  methodName?: string;
  status: TraceStatus;
  estimatedCostUsd: number;
  actualCostUsd: number;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  startedAt: Date;
  completedAt?: Date;
  metadata?: JsonObject;
  promptPayload?: SeedPayload;
  responsePayload?: SeedPayload;
  spans: SeedTraceSpan[];
  events: SeedTraceEvent[];
  ledgers: SeedTraceLedgerEntry[];
  violations?: SeedTraceViolation[];
}

interface SeedSessionInput {
  externalSessionId: string;
  startedAt: Date;
  closedAt?: Date;
  metadata?: JsonObject;
  traces: SeedTraceInput[];
}

interface SeedDatasetRowInput {
  input: JsonValue;
  output?: JsonValue;
  metadata?: JsonObject;
  sourceKind: "file_import" | "trace_export";
  sourceTraceId?: string;
  sourceExternalTraceId?: string;
  sourceSpanId?: string;
  inputRetentionMode?: PayloadRetention;
  outputRetentionMode?: PayloadRetention;
}

interface SeedManualEvalCriterionInput {
  label: string;
  description?: string;
  weight: number;
}

interface SeedManualEvalRunItemReview {
  datasetRowId: string;
  verdict?: "pass" | "fail";
  notes?: string;
  reviewedAt?: Date;
  criterionScores?: Array<{ criterionPosition: number; score: number }>;
}

interface SeedManualEvalRunInput {
  createdAt: Date;
  itemReviews: SeedManualEvalRunItemReview[];
}

interface SeedManualEvalInput {
  name: string;
  description?: string;
  reviewerInstructions?: string;
  criteria: SeedManualEvalCriterionInput[];
  runs: SeedManualEvalRunInput[];
}

interface ManualEvalMetricCriterion {
  id: string;
  label: string;
  weight: number;
}

interface ManualEvalMetricItem {
  verdict?: "pass" | "fail";
  criterionScores?: Array<{ criterionId: string; score: number }>;
}

function timestamp(value: string) {
  return new Date(value);
}

function roundMetric(value: number) {
  return Number(value.toFixed(3));
}

function jsonObject(value: JsonObject | undefined): Prisma.InputJsonObject | undefined {
  if (!value) {
    return undefined;
  }

  return value as Prisma.InputJsonObject;
}

function requiredJsonValue(
  value: JsonValue,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue);
}

function optionalJsonValue(
  value: JsonValue | undefined,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) {
    return undefined;
  }

  return requiredJsonValue(value);
}

function calculateOverallScore(
  criteria: ManualEvalMetricCriterion[],
  scores: Array<{ criterionId: string; score: number }>,
) {
  if (!criteria.length || !scores.length) {
    return undefined;
  }

  let weightedTotal = 0;
  let totalWeight = 0;

  for (const criterion of criteria) {
    const score = scores.find((entry) => entry.criterionId === criterion.id)?.score;
    if (typeof score !== "number") {
      continue;
    }

    weightedTotal += score * criterion.weight;
    totalWeight += criterion.weight;
  }

  if (!totalWeight) {
    return undefined;
  }

  return roundMetric(weightedTotal / totalWeight);
}

function calculateManualEvalMetrics(
  criteria: ManualEvalMetricCriterion[],
  items: ManualEvalMetricItem[],
) {
  const reviewedItems = items.filter((item) => item.verdict);
  const passCount = reviewedItems.filter((item) => item.verdict === "pass").length;
  const failCount = reviewedItems.filter((item) => item.verdict === "fail").length;
  const overallScores = reviewedItems
    .map((item) => calculateOverallScore(criteria, item.criterionScores ?? []))
    .filter((value): value is number => typeof value === "number");

  const criterionAverages = criteria.map((criterion) => {
    const criterionScores = reviewedItems
      .map((item) =>
        item.criterionScores?.find((entry) => entry.criterionId === criterion.id)?.score,
      )
      .filter((value): value is number => typeof value === "number");

    return {
      criterionId: criterion.id,
      label: criterion.label,
      weight: criterion.weight,
      reviewedRows: criterionScores.length,
      averageScore: criterionScores.length
        ? roundMetric(
            criterionScores.reduce((sum, score) => sum + score, 0) /
              criterionScores.length,
          )
        : undefined,
    };
  });

  const reviewedRows = reviewedItems.length;
  const totalRows = items.length;
  const pendingRows = Math.max(totalRows - reviewedRows, 0);

  return {
    totalRows,
    reviewedRows,
    pendingRows,
    passCount,
    failCount,
    passRate: reviewedRows ? roundMetric(passCount / reviewedRows) : 0,
    failRate: reviewedRows ? roundMetric(failCount / reviewedRows) : 0,
    overallAverageScore: overallScores.length
      ? roundMetric(
          overallScores.reduce((sum, score) => sum + score, 0) / overallScores.length,
        )
      : undefined,
    criterionAverages,
  };
}

function ensureSafeToResetDatabase() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run the destructive seed with NODE_ENV=production.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required before running the seed.");
  }
}

async function clearExistingData(db: DbClient) {
  await db.manualEvalRunItem.deleteMany();
  await db.manualEvalRun.deleteMany();
  await db.manualEvalCriterion.deleteMany();
  await db.manualEval.deleteMany();
  await db.datasetRow.deleteMany();
  await db.dataset.deleteMany();
  await db.violation.deleteMany();
  await db.spendLedger.deleteMany();
  await db.traceEvent.deleteMany();
  await db.traceSpan.deleteMany();
  await db.responsePayload.deleteMany();
  await db.promptPayload.deleteMany();
  await db.trace.deleteMany();
  await db.lLMSession.deleteMany();
  await db.hookSecret.deleteMany();
  await db.hookPolicy.deleteMany();
  await db.hookConnection.deleteMany();
  await db.projectMember.deleteMany();
  await db.project.deleteMany();
  await db.verificationToken.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.user.deleteMany();
}

function buildPolicyJson(retentionMode: PayloadRetention, maxSpendUsd: number) {
  return {
    budget: {
      maxSpendUsd,
      softLimitPct: 0.8,
      finalizationReserveUsd: 0.15,
      maxRepeatedCalls: 4,
    },
    call: {
      maxEstimatedCostUsd: Math.max(Number((maxSpendUsd * 0.6).toFixed(2)), 0.05),
      timeoutMs: 30_000,
      retriesCeiling: 1,
    },
    tool: {
      maxCallsPerSession: 12,
    },
    payloads: {
      retentionMode: retentionMode.toLowerCase(),
    },
  } as Prisma.InputJsonObject;
}

async function createHook(
  db: DbClient,
  input: {
    projectId: string;
    publicId: string;
    name: string;
    environment: string;
    status: HookStatus;
    payloadRetention: PayloadRetention;
    policies: Array<{
      version: number;
      isActive: boolean;
      payloadRetention: PayloadRetention;
      maxSpendUsd: number;
    }>;
  },
) {
  const hook = await db.hookConnection.create({
    data: {
      publicId: input.publicId,
      name: input.name,
      environment: input.environment,
      status: input.status,
      ingestEnabled: true,
      syncPolicy: true,
      payloadRetention: input.payloadRetention,
      projectId: input.projectId,
    },
  });

  for (const policy of input.policies) {
    await db.hookPolicy.create({
      data: {
        hookId: hook.id,
        version: policy.version,
        isActive: policy.isActive,
        payloadRetention: policy.payloadRetention,
        policyJson: buildPolicyJson(policy.payloadRetention, policy.maxSpendUsd),
      },
    });
  }

  await db.hookSecret.create({
    data: {
      hookId: hook.id,
      label: `${input.name} ingest secret`,
      tokenHash: `seed:${input.publicId}`,
    },
  });

  return hook;
}

function getSessionTotals(traces: SeedTraceInput[]) {
  const requestCount = traces.length;
  const blockedCount = traces.filter((trace) => trace.status === TraceStatus.BLOCKED).length;
  const toolCallCount = traces.reduce(
    (sum, trace) =>
      sum + trace.spans.filter((span) => span.kind === TraceSpanKind.TOOL).length,
    0,
  );

  return traces.reduce(
    (totals, trace) => {
      for (const entry of trace.ledgers) {
        switch (entry.kind) {
          case LedgerKind.RESERVED:
            totals.totalReservedUsd += entry.amountUsd;
            break;
          case LedgerKind.COMMITTED:
            totals.totalCommittedUsd += entry.amountUsd;
            break;
          case LedgerKind.RELEASED:
            totals.totalReleasedUsd += entry.amountUsd;
            break;
        }
      }

      return totals;
    },
    {
      requestCount,
      blockedCount,
      toolCallCount,
      totalReservedUsd: 0,
      totalCommittedUsd: 0,
      totalReleasedUsd: 0,
    },
  );
}

async function createTraceWithDetails(
  db: DbClient,
  input: {
    hookId: string;
    llmSessionId: string;
    trace: SeedTraceInput;
  },
) {
  const trace = await db.trace.create({
    data: {
      externalTraceId: input.trace.externalTraceId,
      requestId: input.trace.requestId,
      provider: input.trace.provider,
      model: input.trace.model,
      namespace: input.trace.namespace,
      methodName: input.trace.methodName,
      status: input.trace.status,
      estimatedCostUsd: input.trace.estimatedCostUsd,
      actualCostUsd: input.trace.actualCostUsd,
      inputTokens: input.trace.inputTokens,
      outputTokens: input.trace.outputTokens,
      cachedInputTokens: input.trace.cachedInputTokens,
      startedAt: input.trace.startedAt,
      completedAt: input.trace.completedAt,
      metadata: jsonObject(input.trace.metadata),
      hookId: input.hookId,
      llmSessionId: input.llmSessionId,
    },
  });

  if (input.trace.promptPayload) {
    await db.promptPayload.create({
      data: {
        traceId: trace.id,
        retentionMode: input.trace.promptPayload.retentionMode,
        contentRaw: input.trace.promptPayload.contentRaw,
        contentRedacted: input.trace.promptPayload.contentRedacted,
        metadata: jsonObject(input.trace.promptPayload.metadata),
      },
    });
  }

  if (input.trace.responsePayload) {
    await db.responsePayload.create({
      data: {
        traceId: trace.id,
        retentionMode: input.trace.responsePayload.retentionMode,
        contentRaw: input.trace.responsePayload.contentRaw,
        contentRedacted: input.trace.responsePayload.contentRedacted,
        metadata: jsonObject(input.trace.responsePayload.metadata),
      },
    });
  }

  const eventStats = new Map<string, { eventCount: number; lastEventAt: Date }>();
  for (const event of input.trace.events) {
    const spanId = typeof event.spanData?.id === "string" ? event.spanData.id : undefined;
    if (!spanId) {
      continue;
    }

    const current = eventStats.get(spanId);
    if (!current) {
      eventStats.set(spanId, { eventCount: 1, lastEventAt: event.timestamp });
      continue;
    }

    eventStats.set(spanId, {
      eventCount: current.eventCount + 1,
      lastEventAt:
        current.lastEventAt.getTime() > event.timestamp.getTime()
          ? current.lastEventAt
          : event.timestamp,
    });
  }

  for (const span of input.trace.spans) {
    const stats = eventStats.get(span.externalSpanId);

    await db.traceSpan.create({
      data: {
        traceId: trace.id,
        externalSpanId: span.externalSpanId,
        externalParentSpanId: span.externalParentSpanId,
        name: span.name,
        kind: span.kind,
        status: span.status,
        startedAt: span.startedAt,
        endedAt: span.endedAt,
        attributes: jsonObject(span.attributes),
        eventCount: stats?.eventCount ?? 0,
        lastEventAt: stats?.lastEventAt,
      },
    });
  }

  for (const event of input.trace.events) {
    await db.traceEvent.create({
      data: {
        traceDbId: trace.id,
        externalEventId: event.externalEventId,
        type: event.type,
        timestamp: event.timestamp,
        data: event.data as Prisma.InputJsonValue,
        spanData: event.spanData ? (event.spanData as Prisma.InputJsonValue) : undefined,
        metadata: event.metadata ? (event.metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  }

  for (const ledgerEntry of input.trace.ledgers) {
    await db.spendLedger.create({
      data: {
        hookId: input.hookId,
        llmSessionId: input.llmSessionId,
        traceId: trace.id,
        sourceEventId: ledgerEntry.sourceEventId,
        kind: ledgerEntry.kind,
        amountUsd: ledgerEntry.amountUsd,
        createdAt: ledgerEntry.createdAt,
        metadata: jsonObject(ledgerEntry.metadata),
      },
    });
  }

  for (const violation of input.trace.violations ?? []) {
    await db.violation.create({
      data: {
        hookId: input.hookId,
        llmSessionId: input.llmSessionId,
        traceId: trace.id,
        category: violation.category,
        eventType: violation.eventType,
        message: violation.message,
        sourceEventId: violation.sourceEventId,
        createdAt: violation.createdAt,
        details: jsonObject(violation.details),
      },
    });
  }

  const requestSpan =
    input.trace.spans.find((span) => span.kind === TraceSpanKind.REQUEST) ??
    input.trace.spans[0];
  const promptPayload = input.trace.promptPayload;
  const responsePayload = input.trace.responsePayload;

  return {
    traceId: trace.id,
    externalTraceId: trace.externalTraceId,
    requestSpanId: requestSpan?.externalSpanId,
    metadata: input.trace.metadata,
    prompt: promptPayload?.contentRedacted ?? promptPayload?.contentRaw,
    response: responsePayload?.contentRedacted ?? responsePayload?.contentRaw,
    promptRetentionMode: promptPayload?.retentionMode,
    responseRetentionMode: responsePayload?.retentionMode,
  };
}

async function createSessionWithTraces(
  db: DbClient,
  input: {
    projectId: string;
    hookId: string;
    session: SeedSessionInput;
  },
) {
  const totals = getSessionTotals(input.session.traces);
  const session = await db.lLMSession.create({
    data: {
      externalSessionId: input.session.externalSessionId,
      startedAt: input.session.startedAt,
      closedAt: input.session.closedAt,
      totalReservedUsd: totals.totalReservedUsd,
      totalCommittedUsd: totals.totalCommittedUsd,
      totalReleasedUsd: totals.totalReleasedUsd,
      requestCount: totals.requestCount,
      blockedCount: totals.blockedCount,
      toolCallCount: totals.toolCallCount,
      metadata: jsonObject(input.session.metadata),
      projectId: input.projectId,
      hookId: input.hookId,
    },
  });

  const traces = new Map<
    string,
    Awaited<ReturnType<typeof createTraceWithDetails>>
  >();

  for (const trace of input.session.traces) {
    const createdTrace = await createTraceWithDetails(db, {
      hookId: input.hookId,
      llmSessionId: session.id,
      trace,
    });
    traces.set(trace.externalTraceId, createdTrace);
  }

  return { session, traces };
}

async function createDataset(
  db: DbClient,
  input: {
    projectId: string;
    name: string;
    description?: string;
    rows: SeedDatasetRowInput[];
  },
) {
  const dataset = await db.dataset.create({
    data: {
      projectId: input.projectId,
      name: input.name,
      description: input.description,
      rowCount: input.rows.length,
    },
  });

  const rows = [];

  for (const [index, row] of input.rows.entries()) {
    rows.push(
      await db.datasetRow.create({
        data: {
          datasetId: dataset.id,
          position: index + 1,
          input: requiredJsonValue(row.input),
          output: optionalJsonValue(row.output),
          metadata: row.metadata ? (row.metadata as Prisma.InputJsonValue) : undefined,
          sourceKind:
            row.sourceKind === "file_import"
              ? DatasetSourceKind.FILE_IMPORT
              : DatasetSourceKind.TRACE_EXPORT,
          sourceTraceId: row.sourceTraceId,
          sourceExternalTraceId: row.sourceExternalTraceId,
          sourceSpanId: row.sourceSpanId,
          inputRetentionMode: row.inputRetentionMode,
          outputRetentionMode: row.outputRetentionMode,
        },
      }),
    );
  }

  return { dataset, rows };
}

async function createManualEval(
  db: DbClient,
  input: {
    projectId: string;
    datasetId: string;
    userId: string;
    manualEval: SeedManualEvalInput;
  },
) {
  const manualEval = await db.manualEval.create({
    data: {
      projectId: input.projectId,
      datasetId: input.datasetId,
      name: input.manualEval.name,
      description: input.manualEval.description,
      reviewerInstructions: input.manualEval.reviewerInstructions,
      criteria: {
        create: input.manualEval.criteria.map((criterion, index) => ({
          position: index + 1,
          label: criterion.label,
          description: criterion.description,
          weight: criterion.weight,
        })),
      },
    },
    include: {
      criteria: {
        orderBy: { position: "asc" },
      },
    },
  });

  const criteria = manualEval.criteria.map((criterion) => ({
    id: criterion.id,
    label: criterion.label,
    weight: criterion.weight,
  }));

  const aggregatedItems: ManualEvalMetricItem[] = [];

  for (const runInput of input.manualEval.runs) {
    const normalizedItems = runInput.itemReviews.map((item, index) => {
      const criterionScores = item.criterionScores?.map((score) => {
        const criterion = manualEval.criteria.find(
          (entry) => entry.position === score.criterionPosition,
        );

        if (!criterion) {
          throw new Error(
            `Unknown criterion position ${score.criterionPosition} for manual eval ${manualEval.name}.`,
          );
        }

        return {
          criterionId: criterion.id,
          score: score.score,
        };
      });

      aggregatedItems.push({
        verdict: item.verdict,
        criterionScores,
      });

      return {
        position: index + 1,
        datasetRowId: item.datasetRowId,
        verdict: item.verdict,
        notes: item.notes,
        reviewedAt: item.reviewedAt,
        overallScore:
          item.verdict && criterionScores?.length
            ? calculateOverallScore(criteria, criterionScores)
            : undefined,
        criterionScores,
      };
    });

    const metrics = calculateManualEvalMetrics(criteria, normalizedItems);
    const status =
      metrics.pendingRows === 0
        ? ManualEvalRunStatus.COMPLETED
        : ManualEvalRunStatus.IN_PROGRESS;

    await db.manualEvalRun.create({
      data: {
        manualEvalId: manualEval.id,
        datasetId: input.datasetId,
        createdByUserId: input.userId,
        createdAt: runInput.createdAt,
        updatedAt: runInput.createdAt,
        status,
        totalRows: metrics.totalRows,
        reviewedRows: metrics.reviewedRows,
        pendingRows: metrics.pendingRows,
        passCount: metrics.passCount,
        failCount: metrics.failCount,
        averageScore: metrics.overallAverageScore ?? 0,
        criterionAverages: metrics.criterionAverages as Prisma.InputJsonValue,
        completedAt:
          status === ManualEvalRunStatus.COMPLETED
            ? normalizedItems.reduce<Date | undefined>((latest, item) => {
                if (!item.reviewedAt) {
                  return latest;
                }
                if (!latest) {
                  return item.reviewedAt;
                }
                return latest.getTime() > item.reviewedAt.getTime()
                  ? latest
                  : item.reviewedAt;
              }, undefined)
            : undefined,
        items: {
          create: normalizedItems.map((item) => ({
            position: item.position,
            datasetRowId: item.datasetRowId,
            verdict:
              item.verdict === "pass"
                ? ManualEvalVerdict.PASS
                : item.verdict === "fail"
                  ? ManualEvalVerdict.FAIL
                  : undefined,
            notes: item.notes,
            overallScore: item.overallScore,
            criterionScores: item.criterionScores
              ? (item.criterionScores as Prisma.InputJsonValue)
              : undefined,
            reviewedAt: item.reviewedAt,
            reviewerUserId: item.reviewedAt ? input.userId : undefined,
          })),
        },
      },
    });
  }

  const evalMetrics = calculateManualEvalMetrics(criteria, aggregatedItems);

  await db.manualEval.update({
    where: { id: manualEval.id },
    data: {
      runCount: input.manualEval.runs.length,
      totalRows: evalMetrics.totalRows,
      reviewedRows: evalMetrics.reviewedRows,
      pendingRows: evalMetrics.pendingRows,
      passCount: evalMetrics.passCount,
      failCount: evalMetrics.failCount,
      averageScore: evalMetrics.overallAverageScore ?? 0,
      criterionAverages: evalMetrics.criterionAverages as Prisma.InputJsonValue,
    },
  });

  return manualEval;
}

async function main() {
  ensureSafeToResetDatabase();

  const demoEmail = process.env.CAPTAR_DEMO_USER_EMAIL ?? "demo@captar.local";
  const demoPassword = process.env.CAPTAR_DEMO_USER_PASSWORD ?? "captar-demo";
  const demoPrimaryHookId =
    process.env.CAPTAR_DEMO_HOOK_ID ?? "hook_captar_support_prod";
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  await clearExistingData(prisma);
  const db = prisma;

  const user = await db.user.create({
    data: {
      email: demoEmail,
      name: "Captar Demo User",
      passwordHash,
    },
  });

    const frontendProject = await db.project.create({
      data: {
        slug: "captar-frontend-demo",
        name: "Captar Frontend Demo",
        description:
          "Rich local demo data for traces, datasets, and reviewer-driven eval flows.",
        ownerId: user.id,
      },
    });

    const sandboxProject = await db.project.create({
      data: {
        slug: "captar-sandbox",
        name: "Captar Sandbox",
        description:
          "Lightweight secondary project for list views and empty-state testing.",
        ownerId: user.id,
      },
    });

    await db.projectMember.createMany({
      data: [
        {
          projectId: frontendProject.id,
          userId: user.id,
          role: ProjectRole.OWNER,
        },
        {
          projectId: sandboxProject.id,
          userId: user.id,
          role: ProjectRole.OWNER,
        },
      ],
    });

    const supportHook = await createHook(db, {
      projectId: frontendProject.id,
      publicId: demoPrimaryHookId,
      name: "Support Copilot",
      environment: "production",
      status: HookStatus.ACTIVE,
      payloadRetention: PayloadRetention.REDACTED,
      policies: [
        {
          version: 1,
          isActive: false,
          payloadRetention: PayloadRetention.REDACTED,
          maxSpendUsd: 1,
        },
        {
          version: 2,
          isActive: true,
          payloadRetention: PayloadRetention.REDACTED,
          maxSpendUsd: 2,
        },
      ],
    });

    const opsHook = await createHook(db, {
      projectId: frontendProject.id,
      publicId: "hook_captar_ops_staging",
      name: "Ops Assistant",
      environment: "staging",
      status: HookStatus.ACTIVE,
      payloadRetention: PayloadRetention.RAW,
      policies: [
        {
          version: 1,
          isActive: true,
          payloadRetention: PayloadRetention.RAW,
          maxSpendUsd: 1.5,
        },
      ],
    });

    await createHook(db, {
      projectId: sandboxProject.id,
      publicId: "hook_captar_sandbox_dev",
      name: "Sandbox Hook",
      environment: "development",
      status: HookStatus.PAUSED,
      payloadRetention: PayloadRetention.NONE,
      policies: [
        {
          version: 1,
          isActive: true,
          payloadRetention: PayloadRetention.NONE,
          maxSpendUsd: 0.5,
        },
      ],
    });

    const supportSessions: SeedSessionInput[] = [
      {
        externalSessionId: "sess_support_refund_triage",
        startedAt: timestamp("2026-04-08T08:00:00.000Z"),
        closedAt: timestamp("2026-04-08T08:04:30.000Z"),
        metadata: {
          feature: "refund-triage",
          customerTier: "enterprise",
          channel: "chat",
        },
        traces: [
          {
            externalTraceId: "trace_support_refund_completed",
            requestId: "req_support_refund_001",
            provider: "openai",
            model: "gpt-4.1-mini",
            namespace: "responses",
            methodName: "create",
            status: TraceStatus.COMPLETED,
            estimatedCostUsd: 0.12,
            actualCostUsd: 0.098,
            inputTokens: 842,
            outputTokens: 318,
            startedAt: timestamp("2026-04-08T08:00:05.000Z"),
            completedAt: timestamp("2026-04-08T08:00:18.000Z"),
            metadata: {
              caseId: "CASE-1042",
              intent: "refund_request",
              channel: "chat",
              queuedBy: "frontend-demo",
            },
            promptPayload: {
              retentionMode: PayloadRetention.REDACTED,
              contentRedacted:
                "Customer says their annual plan renewed after cancellation and asks for a refund plus confirmation of the next billing date.",
              metadata: {
                redacted: true,
                seed: true,
              },
            },
            responsePayload: {
              retentionMode: PayloadRetention.REDACTED,
              contentRedacted:
                "Refund approved for the duplicate renewal, next billing date canceled, and follow-up email queued with case reference CASE-1042.",
              metadata: {
                redacted: true,
                seed: true,
              },
            },
            spans: [
              {
                externalSpanId: "span_support_refund_session",
                name: "session",
                kind: TraceSpanKind.SESSION,
                status: TraceSpanStatus.COMPLETED,
                startedAt: timestamp("2026-04-08T08:00:00.000Z"),
                endedAt: timestamp("2026-04-08T08:04:30.000Z"),
                attributes: {
                  sessionId: "sess_support_refund_triage",
                  hookId: demoPrimaryHookId,
                  environment: "production",
                },
              },
              {
                externalSpanId: "span_support_refund_request",
                externalParentSpanId: "span_support_refund_session",
                name: "responses.create",
                kind: TraceSpanKind.REQUEST,
                status: TraceSpanStatus.COMPLETED,
                startedAt: timestamp("2026-04-08T08:00:05.000Z"),
                endedAt: timestamp("2026-04-08T08:00:18.000Z"),
                attributes: {
                  provider: "openai",
                  model: "gpt-4.1-mini",
                  requestId: "req_support_refund_001",
                  inputTokens: 842,
                  outputTokens: 318,
                  costUsd: 0.098,
                },
              },
              {
                externalSpanId: "span_support_refund_tool_lookup",
                externalParentSpanId: "span_support_refund_request",
                name: "order.lookup",
                kind: TraceSpanKind.TOOL,
                status: TraceSpanStatus.COMPLETED,
                startedAt: timestamp("2026-04-08T08:00:07.000Z"),
                endedAt: timestamp("2026-04-08T08:00:10.000Z"),
                attributes: {
                  toolName: "order.lookup",
                  lookupStatus: "matched",
                  refundEligible: true,
                },
              },
            ],
            events: [
              {
                externalEventId: "evt_support_refund_started",
                type: "request.started",
                timestamp: timestamp("2026-04-08T08:00:05.000Z"),
                data: {
                  provider: "openai",
                  model: "gpt-4.1-mini",
                  requestId: "req_support_refund_001",
                },
                spanData: {
                  id: "span_support_refund_request",
                  parentId: "span_support_refund_session",
                  name: "responses.create",
                  kind: "request",
                  status: "running",
                  startedAt: "2026-04-08T08:00:05.000Z",
                },
              },
              {
                externalEventId: "evt_support_refund_reserved",
                type: "estimate.reserved",
                timestamp: timestamp("2026-04-08T08:00:05.100Z"),
                data: {
                  reservedUsd: 0.12,
                  provider: "openai",
                  model: "gpt-4.1-mini",
                },
                spanData: {
                  id: "span_support_refund_request",
                  parentId: "span_support_refund_session",
                  name: "responses.create",
                  kind: "request",
                  status: "running",
                  startedAt: "2026-04-08T08:00:05.000Z",
                },
              },
              {
                externalEventId: "evt_support_refund_tool_started",
                type: "tool.started",
                timestamp: timestamp("2026-04-08T08:00:07.000Z"),
                data: {
                  toolName: "order.lookup",
                  orderId: "ord_demo_001",
                },
                spanData: {
                  id: "span_support_refund_tool_lookup",
                  parentId: "span_support_refund_request",
                  name: "order.lookup",
                  kind: "tool",
                  status: "running",
                  startedAt: "2026-04-08T08:00:07.000Z",
                },
              },
              {
                externalEventId: "evt_support_refund_tool_completed",
                type: "tool.completed",
                timestamp: timestamp("2026-04-08T08:00:10.000Z"),
                data: {
                  toolName: "order.lookup",
                  matchedOrder: true,
                  durationMs: 3000,
                },
                spanData: {
                  id: "span_support_refund_tool_lookup",
                  parentId: "span_support_refund_request",
                  name: "order.lookup",
                  kind: "tool",
                  status: "completed",
                  startedAt: "2026-04-08T08:00:07.000Z",
                  endedAt: "2026-04-08T08:00:10.000Z",
                },
              },
              {
                externalEventId: "evt_support_refund_response",
                type: "provider.response",
                timestamp: timestamp("2026-04-08T08:00:18.000Z"),
                data: {
                  inputTokens: 842,
                  outputTokens: 318,
                  costUsd: 0.098,
                },
                spanData: {
                  id: "span_support_refund_request",
                  parentId: "span_support_refund_session",
                  name: "responses.create",
                  kind: "request",
                  status: "completed",
                  startedAt: "2026-04-08T08:00:05.000Z",
                  endedAt: "2026-04-08T08:00:18.000Z",
                },
              },
              {
                externalEventId: "evt_support_refund_committed",
                type: "spend.committed",
                timestamp: timestamp("2026-04-08T08:00:18.100Z"),
                data: {
                  actualCostUsd: 0.098,
                  releasedUsd: 0.022,
                },
                spanData: {
                  id: "span_support_refund_request",
                  parentId: "span_support_refund_session",
                  name: "responses.create",
                  kind: "request",
                  status: "completed",
                  startedAt: "2026-04-08T08:00:05.000Z",
                  endedAt: "2026-04-08T08:00:18.000Z",
                },
              },
            ],
            ledgers: [
              {
                kind: LedgerKind.RESERVED,
                amountUsd: 0.12,
                sourceEventId: "evt_support_refund_reserved",
                createdAt: timestamp("2026-04-08T08:00:05.100Z"),
              },
              {
                kind: LedgerKind.COMMITTED,
                amountUsd: 0.098,
                sourceEventId: "evt_support_refund_committed",
                createdAt: timestamp("2026-04-08T08:00:18.100Z"),
              },
              {
                kind: LedgerKind.RELEASED,
                amountUsd: 0.022,
                sourceEventId: "evt_support_refund_committed",
                createdAt: timestamp("2026-04-08T08:00:18.100Z"),
              },
            ],
          },
          {
            externalTraceId: "trace_support_policy_blocked",
            requestId: "req_support_policy_002",
            provider: "openai",
            model: "gpt-4.1-mini",
            namespace: "responses",
            methodName: "create",
            status: TraceStatus.BLOCKED,
            estimatedCostUsd: 0,
            actualCostUsd: 0,
            inputTokens: 112,
            outputTokens: 0,
            startedAt: timestamp("2026-04-08T08:03:12.000Z"),
            completedAt: timestamp("2026-04-08T08:03:12.500Z"),
            metadata: {
              caseId: "CASE-1048",
              intent: "raw_ssn_request",
              channel: "chat",
              blockedBy: "policy",
            },
            promptPayload: {
              retentionMode: PayloadRetention.REDACTED,
              contentRedacted:
                "Customer asks the assistant to expose a full SSN from the billing profile stored on file.",
              metadata: { redacted: true, seed: true },
            },
            responsePayload: {
              retentionMode: PayloadRetention.REDACTED,
              contentRedacted:
                "Request blocked because it attempts to reveal highly sensitive personal data in plain text.",
              metadata: { redacted: true, seed: true },
            },
            spans: [
              {
                externalSpanId: "span_support_blocked_session",
                name: "session",
                kind: TraceSpanKind.SESSION,
                status: TraceSpanStatus.COMPLETED,
                startedAt: timestamp("2026-04-08T08:00:00.000Z"),
                endedAt: timestamp("2026-04-08T08:04:30.000Z"),
                attributes: {
                  sessionId: "sess_support_refund_triage",
                  hookId: demoPrimaryHookId,
                  environment: "production",
                },
              },
              {
                externalSpanId: "span_support_blocked_request",
                externalParentSpanId: "span_support_blocked_session",
                name: "responses.create",
                kind: TraceSpanKind.REQUEST,
                status: TraceSpanStatus.BLOCKED,
                startedAt: timestamp("2026-04-08T08:03:12.000Z"),
                endedAt: timestamp("2026-04-08T08:03:12.500Z"),
                attributes: {
                  provider: "openai",
                  model: "gpt-4.1-mini",
                  requestId: "req_support_policy_002",
                  blockCategory: "access",
                },
              },
            ],
            events: [
              {
                externalEventId: "evt_support_blocked_started",
                type: "request.started",
                timestamp: timestamp("2026-04-08T08:03:12.000Z"),
                data: {
                  provider: "openai",
                  model: "gpt-4.1-mini",
                  requestId: "req_support_policy_002",
                },
                spanData: {
                  id: "span_support_blocked_request",
                  parentId: "span_support_blocked_session",
                  name: "responses.create",
                  kind: "request",
                  status: "running",
                  startedAt: "2026-04-08T08:03:12.000Z",
                },
              },
              {
                externalEventId: "evt_support_blocked_violation",
                type: "request.blocked",
                timestamp: timestamp("2026-04-08T08:03:12.500Z"),
                data: {
                  category: "access",
                  message: "Blocked because the request asks for a full SSN in plain text.",
                },
                spanData: {
                  id: "span_support_blocked_request",
                  parentId: "span_support_blocked_session",
                  name: "responses.create",
                  kind: "request",
                  status: "blocked",
                  startedAt: "2026-04-08T08:03:12.000Z",
                  endedAt: "2026-04-08T08:03:12.500Z",
                },
              },
            ],
            ledgers: [],
            violations: [
              {
                category: "access",
                eventType: "request.blocked",
                message: "Blocked because the request asks for a full SSN in plain text.",
                sourceEventId: "evt_support_blocked_violation",
                createdAt: timestamp("2026-04-08T08:03:12.500Z"),
                details: {
                  policy: "sensitive-data-protection",
                  customerVisible: true,
                },
              },
            ],
          },
        ],
      },
      {
        externalSessionId: "sess_support_followup_running",
        startedAt: timestamp("2026-04-08T09:11:00.000Z"),
        metadata: {
          feature: "follow-up-draft",
          channel: "email",
          caseId: "CASE-1056",
        },
        traces: [
          {
            externalTraceId: "trace_support_followup_running",
            requestId: "req_support_followup_003",
            provider: "openai",
            model: "gpt-4.1-mini",
            namespace: "responses",
            methodName: "create",
            status: TraceStatus.RUNNING,
            estimatedCostUsd: 0.04,
            actualCostUsd: 0,
            inputTokens: 354,
            startedAt: timestamp("2026-04-08T09:11:05.000Z"),
            metadata: {
              caseId: "CASE-1056",
              intent: "followup_email",
              channel: "email",
            },
            spans: [
              {
                externalSpanId: "span_support_running_session",
                name: "session",
                kind: TraceSpanKind.SESSION,
                status: TraceSpanStatus.RUNNING,
                startedAt: timestamp("2026-04-08T09:11:00.000Z"),
                attributes: {
                  sessionId: "sess_support_followup_running",
                  hookId: demoPrimaryHookId,
                },
              },
              {
                externalSpanId: "span_support_running_request",
                externalParentSpanId: "span_support_running_session",
                name: "responses.create",
                kind: TraceSpanKind.REQUEST,
                status: TraceSpanStatus.RUNNING,
                startedAt: timestamp("2026-04-08T09:11:05.000Z"),
                attributes: {
                  provider: "openai",
                  model: "gpt-4.1-mini",
                  requestId: "req_support_followup_003",
                  expectedChannel: "email",
                },
              },
            ],
            events: [
              {
                externalEventId: "evt_support_running_started",
                type: "request.started",
                timestamp: timestamp("2026-04-08T09:11:05.000Z"),
                data: {
                  provider: "openai",
                  model: "gpt-4.1-mini",
                  requestId: "req_support_followup_003",
                },
                spanData: {
                  id: "span_support_running_request",
                  parentId: "span_support_running_session",
                  name: "responses.create",
                  kind: "request",
                  status: "running",
                  startedAt: "2026-04-08T09:11:05.000Z",
                },
              },
              {
                externalEventId: "evt_support_running_reserved",
                type: "estimate.reserved",
                timestamp: timestamp("2026-04-08T09:11:05.100Z"),
                data: {
                  reservedUsd: 0.04,
                  provider: "openai",
                  model: "gpt-4.1-mini",
                },
                spanData: {
                  id: "span_support_running_request",
                  parentId: "span_support_running_session",
                  name: "responses.create",
                  kind: "request",
                  status: "running",
                  startedAt: "2026-04-08T09:11:05.000Z",
                },
              },
            ],
            ledgers: [
              {
                kind: LedgerKind.RESERVED,
                amountUsd: 0.04,
                sourceEventId: "evt_support_running_reserved",
                createdAt: timestamp("2026-04-08T09:11:05.100Z"),
              },
            ],
          },
        ],
      },
      {
        externalSessionId: "sess_support_tool_failure",
        startedAt: timestamp("2026-04-08T10:02:00.000Z"),
        closedAt: timestamp("2026-04-08T10:02:32.000Z"),
        metadata: {
          feature: "warehouse-lookup",
          channel: "api",
          caseId: "CASE-1061",
        },
        traces: [
          {
            externalTraceId: "trace_support_lookup_failed",
            requestId: "req_support_lookup_004",
            provider: "openai",
            model: "gpt-4.1-mini",
            namespace: "responses",
            methodName: "create",
            status: TraceStatus.FAILED,
            estimatedCostUsd: 0.06,
            actualCostUsd: 0,
            inputTokens: 266,
            startedAt: timestamp("2026-04-08T10:02:04.000Z"),
            completedAt: timestamp("2026-04-08T10:02:20.000Z"),
            metadata: {
              caseId: "CASE-1061",
              intent: "order_lookup",
              dependency: "warehouse-api",
            },
            promptPayload: {
              retentionMode: PayloadRetention.REDACTED,
              contentRedacted:
                "Agent asks for the latest shipment and refund eligibility status for order DEMO-8841.",
              metadata: { redacted: true, seed: true },
            },
            responsePayload: {
              retentionMode: PayloadRetention.REDACTED,
              contentRedacted:
                "No final customer response was produced because the warehouse lookup tool timed out.",
              metadata: { redacted: true, seed: true },
            },
            spans: [
              {
                externalSpanId: "span_support_failed_session",
                name: "session",
                kind: TraceSpanKind.SESSION,
                status: TraceSpanStatus.COMPLETED,
                startedAt: timestamp("2026-04-08T10:02:00.000Z"),
                endedAt: timestamp("2026-04-08T10:02:32.000Z"),
                attributes: {
                  sessionId: "sess_support_tool_failure",
                  hookId: demoPrimaryHookId,
                },
              },
              {
                externalSpanId: "span_support_failed_request",
                externalParentSpanId: "span_support_failed_session",
                name: "responses.create",
                kind: TraceSpanKind.REQUEST,
                status: TraceSpanStatus.FAILED,
                startedAt: timestamp("2026-04-08T10:02:04.000Z"),
                endedAt: timestamp("2026-04-08T10:02:20.000Z"),
                attributes: {
                  provider: "openai",
                  model: "gpt-4.1-mini",
                  requestId: "req_support_lookup_004",
                  failureStage: "tool",
                },
              },
              {
                externalSpanId: "span_support_failed_tool",
                externalParentSpanId: "span_support_failed_request",
                name: "warehouse.lookup",
                kind: TraceSpanKind.TOOL,
                status: TraceSpanStatus.FAILED,
                startedAt: timestamp("2026-04-08T10:02:06.000Z"),
                endedAt: timestamp("2026-04-08T10:02:19.000Z"),
                attributes: {
                  toolName: "warehouse.lookup",
                  timeoutMs: 12000,
                  dependency: "warehouse-api",
                },
              },
            ],
            events: [
              {
                externalEventId: "evt_support_failed_started",
                type: "request.started",
                timestamp: timestamp("2026-04-08T10:02:04.000Z"),
                data: {
                  provider: "openai",
                  model: "gpt-4.1-mini",
                  requestId: "req_support_lookup_004",
                },
                spanData: {
                  id: "span_support_failed_request",
                  parentId: "span_support_failed_session",
                  name: "responses.create",
                  kind: "request",
                  status: "running",
                  startedAt: "2026-04-08T10:02:04.000Z",
                },
              },
              {
                externalEventId: "evt_support_failed_reserved",
                type: "estimate.reserved",
                timestamp: timestamp("2026-04-08T10:02:04.050Z"),
                data: {
                  reservedUsd: 0.06,
                  provider: "openai",
                  model: "gpt-4.1-mini",
                },
                spanData: {
                  id: "span_support_failed_request",
                  parentId: "span_support_failed_session",
                  name: "responses.create",
                  kind: "request",
                  status: "running",
                  startedAt: "2026-04-08T10:02:04.000Z",
                },
              },
              {
                externalEventId: "evt_support_failed_tool_started",
                type: "tool.started",
                timestamp: timestamp("2026-04-08T10:02:06.000Z"),
                data: {
                  toolName: "warehouse.lookup",
                  orderId: "DEMO-8841",
                },
                spanData: {
                  id: "span_support_failed_tool",
                  parentId: "span_support_failed_request",
                  name: "warehouse.lookup",
                  kind: "tool",
                  status: "running",
                  startedAt: "2026-04-08T10:02:06.000Z",
                },
              },
              {
                externalEventId: "evt_support_failed_tool_error",
                type: "tool.failed",
                timestamp: timestamp("2026-04-08T10:02:19.000Z"),
                data: {
                  message: "Warehouse API timed out after 12 seconds.",
                  category: "execution",
                },
                spanData: {
                  id: "span_support_failed_tool",
                  parentId: "span_support_failed_request",
                  name: "warehouse.lookup",
                  kind: "tool",
                  status: "failed",
                  startedAt: "2026-04-08T10:02:06.000Z",
                  endedAt: "2026-04-08T10:02:19.000Z",
                },
              },
              {
                externalEventId: "evt_support_failed_request_error",
                type: "request.failed",
                timestamp: timestamp("2026-04-08T10:02:20.000Z"),
                data: {
                  message: "No final answer returned because a required tool failed.",
                  category: "execution",
                },
                spanData: {
                  id: "span_support_failed_request",
                  parentId: "span_support_failed_session",
                  name: "responses.create",
                  kind: "request",
                  status: "failed",
                  startedAt: "2026-04-08T10:02:04.000Z",
                  endedAt: "2026-04-08T10:02:20.000Z",
                },
              },
              {
                externalEventId: "evt_support_failed_released",
                type: "spend.released",
                timestamp: timestamp("2026-04-08T10:02:20.100Z"),
                data: {
                  releasedUsd: 0.06,
                },
                spanData: {
                  id: "span_support_failed_request",
                  parentId: "span_support_failed_session",
                  name: "responses.create",
                  kind: "request",
                  status: "failed",
                  startedAt: "2026-04-08T10:02:04.000Z",
                  endedAt: "2026-04-08T10:02:20.000Z",
                },
              },
            ],
            ledgers: [
              {
                kind: LedgerKind.RESERVED,
                amountUsd: 0.06,
                sourceEventId: "evt_support_failed_reserved",
                createdAt: timestamp("2026-04-08T10:02:04.050Z"),
              },
              {
                kind: LedgerKind.RELEASED,
                amountUsd: 0.06,
                sourceEventId: "evt_support_failed_released",
                createdAt: timestamp("2026-04-08T10:02:20.100Z"),
              },
            ],
            violations: [
              {
                category: "execution",
                eventType: "request.failed",
                message: "No final answer returned because a required tool failed.",
                sourceEventId: "evt_support_failed_request_error",
                createdAt: timestamp("2026-04-08T10:02:20.000Z"),
                details: {
                  dependency: "warehouse-api",
                  toolName: "warehouse.lookup",
                },
              },
            ],
          },
        ],
      },
    ];

    const opsSessions: SeedSessionInput[] = [
      {
        externalSessionId: "sess_ops_postmortem",
        startedAt: timestamp("2026-04-08T11:15:00.000Z"),
        closedAt: timestamp("2026-04-08T11:15:12.000Z"),
        metadata: {
          feature: "incident-postmortem",
          incident: "INC-2201",
          team: "ops",
        },
        traces: [
          {
            externalTraceId: "trace_ops_postmortem_completed",
            requestId: "req_ops_postmortem_001",
            provider: "openai",
            model: "gpt-4.1-mini",
            namespace: "responses",
            methodName: "create",
            status: TraceStatus.COMPLETED,
            estimatedCostUsd: 0.03,
            actualCostUsd: 0.024,
            inputTokens: 490,
            outputTokens: 180,
            startedAt: timestamp("2026-04-08T11:15:02.000Z"),
            completedAt: timestamp("2026-04-08T11:15:12.000Z"),
            metadata: {
              incident: "INC-2201",
              reportType: "summary",
              team: "ops",
            },
            promptPayload: {
              retentionMode: PayloadRetention.RAW,
              contentRaw:
                "Summarize incident INC-2201 with probable root cause, impacted services, and the next remediation step for the on-call handoff.",
              metadata: {
                seed: true,
                retention: "raw",
              },
            },
            responsePayload: {
              retentionMode: PayloadRetention.RAW,
              contentRaw:
                "INC-2201 was likely caused by a stale queue worker deployment, impacted webhook delivery and billing sync, and the next step is to roll the worker fleet plus replay failed jobs.",
              metadata: {
                seed: true,
                retention: "raw",
              },
            },
            spans: [
              {
                externalSpanId: "span_ops_postmortem_session",
                name: "session",
                kind: TraceSpanKind.SESSION,
                status: TraceSpanStatus.COMPLETED,
                startedAt: timestamp("2026-04-08T11:15:00.000Z"),
                endedAt: timestamp("2026-04-08T11:15:12.000Z"),
                attributes: {
                  sessionId: "sess_ops_postmortem",
                  hookId: "hook_captar_ops_staging",
                },
              },
              {
                externalSpanId: "span_ops_postmortem_request",
                externalParentSpanId: "span_ops_postmortem_session",
                name: "responses.create",
                kind: TraceSpanKind.REQUEST,
                status: TraceSpanStatus.COMPLETED,
                startedAt: timestamp("2026-04-08T11:15:02.000Z"),
                endedAt: timestamp("2026-04-08T11:15:12.000Z"),
                attributes: {
                  provider: "openai",
                  model: "gpt-4.1-mini",
                  requestId: "req_ops_postmortem_001",
                  inputTokens: 490,
                  outputTokens: 180,
                  costUsd: 0.024,
                },
              },
            ],
            events: [
              {
                externalEventId: "evt_ops_started",
                type: "request.started",
                timestamp: timestamp("2026-04-08T11:15:02.000Z"),
                data: {
                  provider: "openai",
                  model: "gpt-4.1-mini",
                  requestId: "req_ops_postmortem_001",
                },
                spanData: {
                  id: "span_ops_postmortem_request",
                  parentId: "span_ops_postmortem_session",
                  name: "responses.create",
                  kind: "request",
                  status: "running",
                  startedAt: "2026-04-08T11:15:02.000Z",
                },
              },
              {
                externalEventId: "evt_ops_reserved",
                type: "estimate.reserved",
                timestamp: timestamp("2026-04-08T11:15:02.050Z"),
                data: {
                  reservedUsd: 0.03,
                  provider: "openai",
                  model: "gpt-4.1-mini",
                },
                spanData: {
                  id: "span_ops_postmortem_request",
                  parentId: "span_ops_postmortem_session",
                  name: "responses.create",
                  kind: "request",
                  status: "running",
                  startedAt: "2026-04-08T11:15:02.000Z",
                },
              },
              {
                externalEventId: "evt_ops_response",
                type: "provider.response",
                timestamp: timestamp("2026-04-08T11:15:12.000Z"),
                data: {
                  inputTokens: 490,
                  outputTokens: 180,
                  costUsd: 0.024,
                },
                spanData: {
                  id: "span_ops_postmortem_request",
                  parentId: "span_ops_postmortem_session",
                  name: "responses.create",
                  kind: "request",
                  status: "completed",
                  startedAt: "2026-04-08T11:15:02.000Z",
                  endedAt: "2026-04-08T11:15:12.000Z",
                },
              },
              {
                externalEventId: "evt_ops_committed",
                type: "spend.committed",
                timestamp: timestamp("2026-04-08T11:15:12.100Z"),
                data: {
                  actualCostUsd: 0.024,
                  releasedUsd: 0.006,
                },
                spanData: {
                  id: "span_ops_postmortem_request",
                  parentId: "span_ops_postmortem_session",
                  name: "responses.create",
                  kind: "request",
                  status: "completed",
                  startedAt: "2026-04-08T11:15:02.000Z",
                  endedAt: "2026-04-08T11:15:12.000Z",
                },
              },
            ],
            ledgers: [
              {
                kind: LedgerKind.RESERVED,
                amountUsd: 0.03,
                sourceEventId: "evt_ops_reserved",
                createdAt: timestamp("2026-04-08T11:15:02.050Z"),
              },
              {
                kind: LedgerKind.COMMITTED,
                amountUsd: 0.024,
                sourceEventId: "evt_ops_committed",
                createdAt: timestamp("2026-04-08T11:15:12.100Z"),
              },
              {
                kind: LedgerKind.RELEASED,
                amountUsd: 0.006,
                sourceEventId: "evt_ops_committed",
                createdAt: timestamp("2026-04-08T11:15:12.100Z"),
              },
            ],
          },
        ],
      },
    ];

    const createdTraces = new Map<
      string,
      Awaited<ReturnType<typeof createTraceWithDetails>>
    >();

    for (const session of supportSessions) {
      const created = await createSessionWithTraces(db, {
        projectId: frontendProject.id,
        hookId: supportHook.id,
        session,
      });

      for (const [traceId, trace] of created.traces) {
        createdTraces.set(traceId, trace);
      }
    }

    for (const session of opsSessions) {
      const created = await createSessionWithTraces(db, {
        projectId: frontendProject.id,
        hookId: opsHook.id,
        session,
      });

      for (const [traceId, trace] of created.traces) {
        createdTraces.set(traceId, trace);
      }
    }

    const importedDataset = await createDataset(db, {
      projectId: frontendProject.id,
      name: "Support QA Baseline",
      description:
        "Imported reference rows for refund, escalation, and billing response reviews.",
      rows: [
        {
          input:
            "Customer says they were charged twice after canceling and wants the next billing cycle removed.",
          output:
            "Apologize, confirm the duplicate renewal is refunded, and state that no further billing is scheduled.",
          metadata: {
            channel: "chat",
            scenario: "refund",
            importedFrom: "seed",
          },
          sourceKind: "file_import",
        },
        {
          input:
            "Customer asks for escalation after waiting three days for a shipping update.",
          output:
            "Acknowledge the delay, summarize the current shipment status, and offer to escalate to fulfillment support.",
          metadata: {
            channel: "email",
            scenario: "shipping-delay",
            importedFrom: "seed",
          },
          sourceKind: "file_import",
        },
        {
          input:
            "Customer requests a refund even though the refund window expired last month.",
          output:
            "Decline the refund, explain why the policy no longer allows it, and point to the cancellation and appeal options.",
          metadata: {
            channel: "chat",
            scenario: "policy-edge-case",
            importedFrom: "seed",
          },
          sourceKind: "file_import",
        },
        {
          input:
            "Customer wants billing dates summarized in a calmer tone after a frustrating support thread.",
          output:
            "Restate the current subscription status, next billing date, and available downgrade options in a calm tone.",
          metadata: {
            channel: "voice",
            scenario: "tone-rewrite",
            importedFrom: "seed",
          },
          sourceKind: "file_import",
        },
      ],
    });

    const refundTrace = createdTraces.get("trace_support_refund_completed");
    const blockedTrace = createdTraces.get("trace_support_policy_blocked");
    const failedTrace = createdTraces.get("trace_support_lookup_failed");
    const opsTrace = createdTraces.get("trace_ops_postmortem_completed");

    if (!refundTrace || !blockedTrace || !failedTrace || !opsTrace) {
      throw new Error("Expected seeded traces were not created.");
    }

    const traceExportDataset = await createDataset(db, {
      projectId: frontendProject.id,
      name: "Trace Export Review Queue",
      description:
        "Trace-derived rows with mixed retention modes for frontend and reviewer testing.",
      rows: [
        {
          input: refundTrace.prompt ?? "Missing prompt",
          output: refundTrace.response,
          metadata: {
            scenario: "refund-trace-export",
            traceStatus: "completed",
            sourceCaseId: "CASE-1042",
          },
          sourceKind: "trace_export",
          sourceTraceId: refundTrace.traceId,
          sourceExternalTraceId: refundTrace.externalTraceId,
          sourceSpanId: refundTrace.requestSpanId,
          inputRetentionMode: refundTrace.promptRetentionMode,
          outputRetentionMode: refundTrace.responseRetentionMode,
        },
        {
          input: blockedTrace.prompt ?? "Missing prompt",
          output: blockedTrace.response,
          metadata: {
            scenario: "blocked-trace-export",
            traceStatus: "blocked",
            sourceCaseId: "CASE-1048",
          },
          sourceKind: "trace_export",
          sourceTraceId: blockedTrace.traceId,
          sourceExternalTraceId: blockedTrace.externalTraceId,
          sourceSpanId: blockedTrace.requestSpanId,
          inputRetentionMode: blockedTrace.promptRetentionMode,
          outputRetentionMode: blockedTrace.responseRetentionMode,
        },
        {
          input: failedTrace.prompt ?? "Missing prompt",
          metadata: {
            scenario: "failed-trace-export",
            traceStatus: "failed",
            sourceCaseId: "CASE-1061",
          },
          sourceKind: "trace_export",
          sourceTraceId: failedTrace.traceId,
          sourceExternalTraceId: failedTrace.externalTraceId,
          sourceSpanId: failedTrace.requestSpanId,
          inputRetentionMode: failedTrace.promptRetentionMode,
          outputRetentionMode: failedTrace.responseRetentionMode,
        },
        {
          input: opsTrace.prompt ?? "Missing prompt",
          output: opsTrace.response,
          metadata: {
            scenario: "ops-trace-export",
            traceStatus: "completed",
            sourceIncident: "INC-2201",
          },
          sourceKind: "trace_export",
          sourceTraceId: opsTrace.traceId,
          sourceExternalTraceId: opsTrace.externalTraceId,
          sourceSpanId: opsTrace.requestSpanId,
          inputRetentionMode: opsTrace.promptRetentionMode,
          outputRetentionMode: opsTrace.responseRetentionMode,
        },
      ],
    });

    const emptyDataset = await createDataset(db, {
      projectId: frontendProject.id,
      name: "Incoming Frontend Checks",
      description:
        "Reserved empty dataset for import, trace export, and empty-state testing.",
      rows: [],
    });

    await createManualEval(db, {
      projectId: frontendProject.id,
      datasetId: importedDataset.dataset.id,
      userId: user.id,
      manualEval: {
        name: "support-response-quality",
        description:
          "Manual pass/fail review for imported support responses and tone expectations.",
        reviewerInstructions:
          "Check accuracy first, then policy fit, then tone. Use notes when a fail needs follow-up from the support content team.",
        criteria: [
          {
            label: "Accuracy",
            description: "Does the answer resolve the customer request correctly?",
            weight: 2,
          },
          {
            label: "Policy Fit",
            description: "Does the answer stay inside support and refund policy?",
            weight: 2,
          },
          {
            label: "Tone",
            description: "Is the response calm, direct, and useful?",
            weight: 1,
          },
        ],
        runs: [
          {
            createdAt: timestamp("2026-04-08T12:30:00.000Z"),
            itemReviews: [
              {
                datasetRowId: importedDataset.rows[0]!.id,
                verdict: "pass",
                notes: "Strong refund resolution and clear next-step language.",
                reviewedAt: timestamp("2026-04-08T12:31:00.000Z"),
                criterionScores: [
                  { criterionPosition: 1, score: 5 },
                  { criterionPosition: 2, score: 5 },
                  { criterionPosition: 3, score: 4 },
                ],
              },
              {
                datasetRowId: importedDataset.rows[1]!.id,
                verdict: "pass",
                notes: "Good escalation framing without overpromising delivery timing.",
                reviewedAt: timestamp("2026-04-08T12:34:00.000Z"),
                criterionScores: [
                  { criterionPosition: 1, score: 4 },
                  { criterionPosition: 2, score: 4 },
                  { criterionPosition: 3, score: 5 },
                ],
              },
              {
                datasetRowId: importedDataset.rows[2]!.id,
                verdict: "fail",
                notes:
                  "The answer needs a more explicit explanation of the appeal path after declining the refund.",
                reviewedAt: timestamp("2026-04-08T12:37:00.000Z"),
                criterionScores: [
                  { criterionPosition: 1, score: 2 },
                  { criterionPosition: 2, score: 3 },
                  { criterionPosition: 3, score: 3 },
                ],
              },
              {
                datasetRowId: importedDataset.rows[3]!.id,
                verdict: "pass",
                notes: "Good tone rewrite and still preserves the billing facts.",
                reviewedAt: timestamp("2026-04-08T12:40:00.000Z"),
                criterionScores: [
                  { criterionPosition: 1, score: 5 },
                  { criterionPosition: 2, score: 4 },
                  { criterionPosition: 3, score: 4 },
                ],
              },
            ],
          },
        ],
      },
    });

    await createManualEval(db, {
      projectId: frontendProject.id,
      datasetId: traceExportDataset.dataset.id,
      userId: user.id,
      manualEval: {
        name: "trace-export-triage",
        description:
          "Review seeded trace exports before turning them into a benchmark or escalation set.",
        reviewerInstructions:
          "Prioritize outcome correctness and safety. A blocked response can still pass if the refusal is correct and user-facing language stays clear.",
        criteria: [
          {
            label: "Outcome Correctness",
            description: "Does the captured output match the right operational result?",
            weight: 2,
          },
          {
            label: "Safety",
            description: "Does the row stay aligned with policy and payload retention?",
            weight: 2,
          },
          {
            label: "Actionability",
            description: "Would this row be useful in a future benchmark or review set?",
            weight: 1,
          },
        ],
        runs: [
          {
            createdAt: timestamp("2026-04-08T13:10:00.000Z"),
            itemReviews: [
              {
                datasetRowId: traceExportDataset.rows[0]!.id,
                verdict: "pass",
                notes: "Useful benchmark row with realistic redacted prompt and response.",
                reviewedAt: timestamp("2026-04-08T13:12:00.000Z"),
                criterionScores: [
                  { criterionPosition: 1, score: 5 },
                  { criterionPosition: 2, score: 4 },
                  { criterionPosition: 3, score: 5 },
                ],
              },
              {
                datasetRowId: traceExportDataset.rows[1]!.id,
                verdict: "pass",
                notes: "Safe refusal and good example of a policy-blocked trace export.",
                reviewedAt: timestamp("2026-04-08T13:15:00.000Z"),
                criterionScores: [
                  { criterionPosition: 1, score: 4 },
                  { criterionPosition: 2, score: 5 },
                  { criterionPosition: 3, score: 4 },
                ],
              },
              {
                datasetRowId: traceExportDataset.rows[2]!.id,
              },
              {
                datasetRowId: traceExportDataset.rows[3]!.id,
              },
            ],
          },
        ],
      },
    });

  const seedSummary = {
    user,
    frontendProject,
    sandboxProject,
    supportHook,
    opsHook,
    datasets: {
      imported: importedDataset.dataset,
      traceExport: traceExportDataset.dataset,
      empty: emptyDataset.dataset,
    },
    traces: {
      refund: refundTrace,
      blocked: blockedTrace,
      running: createdTraces.get("trace_support_followup_running"),
      failed: failedTrace,
      ops: opsTrace,
    },
  };

  console.log("Frontend demo seed complete.");
  console.log("");
  console.log("Seeded credentials");
  console.log(`- email: ${demoEmail}`);
  console.log(`- password: ${demoPassword}`);
  console.log("");
  console.log("Projects");
  console.log(
    `- rich demo: /projects/${seedSummary.frontendProject.id} (${seedSummary.frontendProject.slug})`,
  );
  console.log(
    `- sandbox: /projects/${seedSummary.sandboxProject.id} (${seedSummary.sandboxProject.slug})`,
  );
  console.log("");
  console.log("Useful frontend routes");
  console.log(`- hook: /hooks/${seedSummary.supportHook.publicId}`);
  console.log(`- hook: /hooks/${seedSummary.opsHook.publicId}`);
  console.log(
    `- dataset: /projects/${seedSummary.frontendProject.id}/datasets/${seedSummary.datasets.imported.id}`,
  );
  console.log(
    `- dataset: /projects/${seedSummary.frontendProject.id}/datasets/${seedSummary.datasets.traceExport.id}`,
  );
  console.log(
    `- trace: /traces/${seedSummary.traces.refund.traceId}`,
  );
  if (seedSummary.traces.running) {
    console.log(`- running trace: /traces/${seedSummary.traces.running.traceId}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

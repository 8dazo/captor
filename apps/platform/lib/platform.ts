import {
  HookStatus,
  LedgerKind,
  PayloadRetention,
  ProjectRole,
  TraceStatus,
  type Prisma,
} from "@prisma/client";
import type { ExportBatch } from "@captar/types";

import { prisma } from "./db";
import { extractPromptContent, extractResponseContent, redactContent } from "./redaction";
import { slugify } from "./utils";

function decimalToNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value == null) {
    return 0;
  }
  return typeof value === "number" ? value : Number(value);
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

function findOrCreateTraceState(
  state: Map<string, { traceDbId: string; hookDbId: string; sessionDbId: string }>,
  key: string,
  value: { traceDbId: string; hookDbId: string; sessionDbId: string },
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
  const traceState = new Map<string, { traceDbId: string; hookDbId: string; sessionDbId: string }>();

  for (const event of batch.events ?? []) {
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
        hookDbId: hook.id,
        sessionDbId: session.id,
      });
    }

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
        metadata: event.metadata ? (event.metadata as Prisma.JsonObject) : undefined,
      },
      create: {
        traceDbId,
        externalEventId: event.id,
        type: event.type,
        timestamp: new Date(event.timestamp),
        data: event.data as Prisma.JsonObject,
        metadata: event.metadata ? (event.metadata as Prisma.JsonObject) : undefined,
      },
    });

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
          inputTokens: typeof data.inputTokens === "number" ? data.inputTokens : undefined,
          outputTokens: typeof data.outputTokens === "number" ? data.outputTokens : undefined,
          cachedInputTokens:
            typeof data.cachedInputTokens === "number" ? data.cachedInputTokens : undefined,
          actualCostUsd:
            typeof data.costUsd === "number" ? data.costUsd : undefined,
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
        await prisma.spendLedger.create({
          data: {
            hookId: hook.id,
            llmSessionId: session.id,
            traceId: traceDbId,
            kind: LedgerKind.RESERVED,
            amountUsd: data.reservedUsd,
            metadata: data as Prisma.JsonObject,
          },
        });
      }

      if (event.type === "spend.committed") {
        if (typeof data.actualCostUsd === "number") {
          await prisma.spendLedger.create({
            data: {
              hookId: hook.id,
              llmSessionId: session.id,
              traceId: traceDbId,
              kind: LedgerKind.COMMITTED,
              amountUsd: data.actualCostUsd,
              metadata: data as Prisma.JsonObject,
            },
          });
        }
        if (typeof data.releasedUsd === "number" && data.releasedUsd > 0) {
          await prisma.spendLedger.create({
            data: {
              hookId: hook.id,
              llmSessionId: session.id,
              traceId: traceDbId,
              kind: LedgerKind.RELEASED,
              amountUsd: data.releasedUsd,
              metadata: data as Prisma.JsonObject,
            },
          });
        }
      }
    }

    if (event.type === "request.blocked" || event.type === "guardrail.violation") {
      const data = event.data as Record<string, unknown>;
      await prisma.violation.create({
        data: {
          hookId: hook.id,
          llmSessionId: session.id,
          traceId: traceDbId,
          category:
            typeof data.category === "string"
              ? data.category
              : event.type === "request.blocked"
                ? "access"
                : "workflow",
          eventType: event.type,
          message: String(data.reason ?? data.message ?? "Guardrail violation"),
          details: data as Prisma.JsonObject,
        },
      });

      await prisma.trace.update({
        where: { id: traceDbId },
        data: { status: TraceStatus.BLOCKED },
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

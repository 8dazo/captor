import bcrypt from "bcryptjs";
import { PrismaClient, PayloadRetention, ProjectRole, TraceStatus, LedgerKind, HookStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const demoEmail = process.env.CAPTAR_DEMO_USER_EMAIL ?? "demo@captar.local";
  const demoPassword = process.env.CAPTAR_DEMO_USER_PASSWORD ?? "captar-demo";
  const demoHookId = process.env.CAPTAR_DEMO_HOOK_ID ?? "hook_demo_live";
  const passwordHash = await bcrypt.hash(demoPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {
      name: "Captar Demo User",
      passwordHash,
    },
    create: {
      email: demoEmail,
      name: "Captar Demo User",
      passwordHash,
    },
  });

  const project = await prisma.project.upsert({
    where: { slug: "captar-demo-project" },
    update: {
      name: "Captar Demo Project",
      ownerId: user.id,
    },
    create: {
      slug: "captar-demo-project",
      name: "Captar Demo Project",
      description: "Demo project for local hook-connected observability.",
      ownerId: user.id,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: user.id,
      },
    },
    update: {
      role: ProjectRole.OWNER,
    },
    create: {
      projectId: project.id,
      userId: user.id,
      role: ProjectRole.OWNER,
    },
  });

  const hook = await prisma.hookConnection.upsert({
    where: { publicId: demoHookId },
    update: {
      name: "Live Demo Hook",
      environment: "development",
      status: HookStatus.ACTIVE,
      ingestEnabled: true,
      syncPolicy: true,
      payloadRetention: PayloadRetention.REDACTED,
      projectId: project.id,
    },
    create: {
      publicId: demoHookId,
      name: "Live Demo Hook",
      environment: "development",
      status: HookStatus.ACTIVE,
      ingestEnabled: true,
      syncPolicy: true,
      payloadRetention: PayloadRetention.REDACTED,
      projectId: project.id,
    },
  });

  const policyJson = {
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
  };

  const policy = await prisma.hookPolicy.upsert({
    where: {
      hookId_version: {
        hookId: hook.id,
        version: 1,
      },
    },
    update: {
      isActive: true,
      payloadRetention: PayloadRetention.REDACTED,
      policyJson,
    },
    create: {
      hookId: hook.id,
      version: 1,
      isActive: true,
      payloadRetention: PayloadRetention.REDACTED,
      policyJson,
    },
  });

  await prisma.hookPolicy.updateMany({
    where: {
      hookId: hook.id,
      NOT: { id: policy.id },
    },
    data: {
      isActive: false,
    },
  });

  await prisma.hookSecret.upsert({
    where: {
      id: `secret_${hook.id}`,
    },
    update: {
      label: "Default Demo Ingest Secret",
      tokenHash: "public-demo-hook",
      hookId: hook.id,
    },
    create: {
      id: `secret_${hook.id}`,
      label: "Default Demo Ingest Secret",
      tokenHash: "public-demo-hook",
      hookId: hook.id,
    },
  });

  const externalSessionId = "seed_session_demo";
  const llmSession = await prisma.lLMSession.upsert({
    where: { externalSessionId },
    update: {
      projectId: project.id,
      hookId: hook.id,
      totalCommittedUsd: 0.038,
      totalReservedUsd: 0.06,
      totalReleasedUsd: 0.022,
      requestCount: 1,
      blockedCount: 0,
      toolCallCount: 0,
    },
    create: {
      externalSessionId,
      projectId: project.id,
      hookId: hook.id,
      startedAt: new Date("2026-04-04T06:00:00.000Z"),
      closedAt: new Date("2026-04-04T06:00:08.000Z"),
      totalCommittedUsd: 0.038,
      totalReservedUsd: 0.06,
      totalReleasedUsd: 0.022,
      requestCount: 1,
      blockedCount: 0,
      toolCallCount: 0,
      metadata: {
        _user: "demo-user",
        feature: "seed",
      },
    },
  });

  const trace = await prisma.trace.upsert({
    where: {
      hookId_externalTraceId: {
        hookId: hook.id,
        externalTraceId: "seed_trace_demo",
      },
    },
    update: {
      provider: "openai",
      model: "gpt-4.1-mini",
      status: TraceStatus.COMPLETED,
      estimatedCostUsd: 0.06,
      actualCostUsd: 0.038,
      inputTokens: 120,
      outputTokens: 80,
      completedAt: new Date("2026-04-04T06:00:08.000Z"),
      llmSessionId: llmSession.id,
      hookId: hook.id,
    },
    create: {
      externalTraceId: "seed_trace_demo",
      requestId: "seed_request_demo",
      provider: "openai",
      model: "gpt-4.1-mini",
      namespace: "responses",
      methodName: "create",
      status: TraceStatus.COMPLETED,
      estimatedCostUsd: 0.06,
      actualCostUsd: 0.038,
      inputTokens: 120,
      outputTokens: 80,
      startedAt: new Date("2026-04-04T06:00:01.000Z"),
      completedAt: new Date("2026-04-04T06:00:08.000Z"),
      metadata: {
        feature: "seed",
      },
      hookId: hook.id,
      llmSessionId: llmSession.id,
    },
  });

  await prisma.promptPayload.upsert({
    where: { traceId: trace.id },
    update: {
      retentionMode: PayloadRetention.REDACTED,
      contentRedacted: "[REDACTED PROMPT]",
      metadata: { redacted: true },
    },
    create: {
      traceId: trace.id,
      retentionMode: PayloadRetention.REDACTED,
      contentRedacted: "[REDACTED PROMPT]",
      metadata: { redacted: true },
    },
  });

  await prisma.responsePayload.upsert({
    where: { traceId: trace.id },
    update: {
      retentionMode: PayloadRetention.REDACTED,
      contentRedacted: "[REDACTED RESPONSE]",
      metadata: { redacted: true },
    },
    create: {
      traceId: trace.id,
      retentionMode: PayloadRetention.REDACTED,
      contentRedacted: "[REDACTED RESPONSE]",
      metadata: { redacted: true },
    },
  });

  await prisma.traceEvent.createMany({
    data: [
      {
        traceDbId: trace.id,
        externalEventId: "evt_seed_started",
        type: "request.started",
        timestamp: new Date("2026-04-04T06:00:01.000Z"),
        data: { provider: "openai", model: "gpt-4.1-mini" },
      },
      {
        traceDbId: trace.id,
        externalEventId: "evt_seed_committed",
        type: "spend.committed",
        timestamp: new Date("2026-04-04T06:00:08.000Z"),
        data: { actualCostUsd: 0.038, releasedUsd: 0.022 },
      },
    ],
    skipDuplicates: true,
  });

  await prisma.spendLedger.createMany({
    data: [
      {
        hookId: hook.id,
        llmSessionId: llmSession.id,
        traceId: trace.id,
        kind: LedgerKind.RESERVED,
        amountUsd: 0.06,
      },
      {
        hookId: hook.id,
        llmSessionId: llmSession.id,
        traceId: trace.id,
        kind: LedgerKind.COMMITTED,
        amountUsd: 0.038,
      },
      {
        hookId: hook.id,
        llmSessionId: llmSession.id,
        traceId: trace.id,
        kind: LedgerKind.RELEASED,
        amountUsd: 0.022,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed complete", {
    demoEmail,
    demoPassword,
    project: project.slug,
    hookId: hook.publicId,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { defaultSessionPolicy, getCaptarEnvConfig } from "@captar/config";
import type {
  CaptarOptions,
  CaptarSession,
  ControlPlaneHook,
  Exporter,
  OpenAIWrapOptions,
  SessionPolicy,
  StartSessionOptions,
  TrackToolOptions,
} from "@captar/types";
import { createId } from "@captar/utils";

import { EventBus } from "./internal/event-bus.js";
import { HttpBatchExporter, NoopExporter } from "./internal/exporter.js";
import { OpenAIAdapter } from "./internal/openai-adapter.js";
import { PolicyEngine } from "./internal/policy-engine.js";
import { PricingRegistry } from "./internal/pricing-registry.js";
import { RuntimeSession } from "./internal/session.js";
import { createTrackedTool } from "./internal/tools.js";

export * from "@captar/types";
export { eventToSpanRecord } from "./internal/telemetry.js";

function createExporter(options: CaptarOptions): Exporter | HttpBatchExporter {
  const exporterProject = options.project;
  const exporterHookId = options.controlPlane?.hookId;
  if (!options.exporter) {
    const envConfig = getCaptarEnvConfig();
    if (envConfig.ingestUrl) {
      const exporterOptions: { url: string; apiKey?: string } = {
        url: envConfig.ingestUrl,
      };
      if (envConfig.ingestApiKey) {
        exporterOptions.apiKey = envConfig.ingestApiKey;
      }
      return new HttpBatchExporter(exporterOptions, exporterProject, exporterHookId);
    }
    return new NoopExporter();
  }

  if ("export" in options.exporter) {
    return options.exporter;
  }

  return new HttpBatchExporter(options.exporter, exporterProject, exporterHookId);
}

function mergePolicy(
  base: SessionPolicy | undefined,
  override: SessionPolicy | undefined,
): SessionPolicy | undefined {
  if (!base && !override) {
    return undefined;
  }

  return {
    budget: { ...base?.budget, ...override?.budget },
    call: { ...base?.call, ...override?.call },
    tool: { ...base?.tool, ...override?.tool },
  };
}

async function fetchControlPlanePolicy(
  options: CaptarOptions,
): Promise<SessionPolicy | undefined> {
  const controlPlane = options.controlPlane;
  if (!controlPlane?.syncPolicy) {
    return undefined;
  }

  const baseUrl = controlPlane.baseUrl ?? "http://localhost:3000";
  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/api/hooks/${controlPlane.hookId}/policy`,
    {
      headers: {
        ...(controlPlane.apiKey
          ? { authorization: `Bearer ${controlPlane.apiKey}` }
          : {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      `Failed to load control-plane policy for ${controlPlane.hookId}.`,
    );
  }

  const payload = (await response.json()) as { hook: ControlPlaneHook };
  return payload.hook.policy;
}

export function createCaptar(options: CaptarOptions) {
  const bus = new EventBus();
  const exporter = createExporter(options);
  const pricingRegistry = new PricingRegistry(
    options.pricing ?? "builtin",
    options.pricingOverrides,
  );

  return {
    onEvent(listener: (event: Parameters<typeof bus.emit>[0]) => void | Promise<void>) {
      return bus.subscribe(listener);
    },

    async startSession(sessionOptions: StartSessionOptions = {}): Promise<CaptarSession> {
      const remotePolicy = await fetchControlPlanePolicy(options);
      const policy = mergePolicy(
        mergePolicy(
          mergePolicy(defaultSessionPolicy, options.defaultPolicy),
          remotePolicy,
        ),
        sessionOptions.policy,
      );
      const metadata = {
        ...sessionOptions.metadata,
        ...(options.controlPlane
          ? { _captarHookId: options.controlPlane.hookId }
          : {}),
      };
      const session = new RuntimeSession(
        options.project,
        {
          ...policy?.budget,
          ...sessionOptions.budget,
        },
        metadata,
        policy,
        bus,
        exporter as HttpBatchExporter | NoopExporter,
      );
      await session.initialize();
      return session;
    },

    wrapOpenAI<TClient extends Record<string, any>>(
      client: TClient,
      wrapOptions: OpenAIWrapOptions,
    ): TClient {
      const session = wrapOptions.session as RuntimeSession;
      const policy = mergePolicy(session.policy, wrapOptions.policy);
      const policyEngine = new PolicyEngine();

      const wrapMethod = (
        namespace: string,
        methodName: string,
        invoke: (request: Record<string, unknown>) => Promise<any>,
      ) => {
        return async (request: Record<string, unknown>) => {
          const adapter = new OpenAIAdapter(
            pricingRegistry,
            invoke,
            policy?.call?.timeoutMs,
          );
          const estimate = await adapter.estimate(request);
          session.markRequest(false);
          await session.emit("request.started", {
            provider: "openai",
            model: estimate.model,
            requestId: createId("req"),
            namespace,
            methodName,
            request,
          });

          try {
            policyEngine.evaluateCall(request, policy, estimate.estimatedCostUsd);
          } catch (error) {
            session.markRequest(true);
            await session.emit("request.blocked", {
              reason: error instanceof Error ? error.message : "blocked",
              provider: "openai",
              model: estimate.model,
            });
            throw error;
          }

          await session.emit("request.allowed", {
            provider: "openai",
            model: estimate.model,
            estimatedCostUsd: estimate.estimatedCostUsd,
          });

          const reservedUsd = session.reserve(estimate.estimatedCostUsd, {
            label: methodName,
          });
          await session.emit("estimate.reserved", {
            provider: "openai",
            model: estimate.model,
            reservedUsd,
          });

          const response = await adapter.execute(request);

          if (
            request.stream &&
            typeof response === "object" &&
            response !== null &&
            Symbol.asyncIterator in response
          ) {
            const chunks: Array<Partial<Record<string, number>>> = [];
            const stream = response as unknown as AsyncIterable<Record<string, unknown>>;
            const wrapped = {
              async *[Symbol.asyncIterator]() {
                for await (const chunk of stream) {
                  const usage = chunk.usage;
                  if (usage && typeof usage === "object") {
                    chunks.push(usage as Partial<Record<string, number>>);
                  }
                  yield chunk;
                }
                const actualUsage = adapter.extractStreamUsage(
                  estimate.model,
                  chunks,
                  estimate.estimatedCostUsd,
                );
                const reconciliation = session.commit(
                  reservedUsd,
                  actualUsage.costUsd,
                );
                await session.emit(
                  "provider.response",
                  {
                    ...actualUsage,
                    response,
                  } as unknown as Record<string, unknown>,
                );
                await session.emit("spend.committed", {
                  provider: "openai",
                  model: actualUsage.model,
                  actualCostUsd: reconciliation.actualUsd,
                  releasedUsd: reconciliation.releasedUsd,
                });
              },
            };

            return wrapped;
          }

          const actualUsage = adapter.extractUsage(
            response as Record<string, unknown>,
            estimate.estimatedCostUsd,
          );
          const reconciliation = session.commit(reservedUsd, actualUsage.costUsd);
          await session.emit(
            "provider.response",
            {
              ...actualUsage,
              response,
            } as unknown as Record<string, unknown>,
          );
          await session.emit("spend.committed", {
            provider: "openai",
            model: actualUsage.model,
            actualCostUsd: reconciliation.actualUsd,
            releasedUsd: reconciliation.releasedUsd,
          });
          return response;
        };
      };

      const wrapped = {
        ...client,
        responses: {
          ...client.responses,
          create: wrapMethod("responses", "create", (request) =>
            client.responses.create(request),
          ),
        },
        chat: {
          ...client.chat,
          completions: {
            ...client.chat?.completions,
            create: wrapMethod("chat.completions", "create", (request) =>
              client.chat.completions.create(request),
            ),
          },
        },
      };

      return wrapped;
    },

    trackTool<TArgs, TResult>(
      name: string,
      toolOptions: TrackToolOptions<TArgs, TResult>,
    ) {
      return createTrackedTool(name, toolOptions, new PolicyEngine());
    },

    async flush(): Promise<void> {
      if ("flush" in exporter && exporter.flush) {
        await exporter.flush();
      }
    },
  };
}

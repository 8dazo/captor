import { defaultSessionPolicy, getCaptarEnvConfig } from "@captar/config";
import type {
  CaptarOptions,
  CaptarSession,
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
  if (!options.exporter) {
    const envConfig = getCaptarEnvConfig();
    if (envConfig.ingestUrl) {
      const exporterOptions: { url: string; apiKey?: string } = {
        url: envConfig.ingestUrl,
      };
      if (envConfig.ingestApiKey) {
        exporterOptions.apiKey = envConfig.ingestApiKey;
      }
      return new HttpBatchExporter(exporterOptions, options.project);
    }
    return new NoopExporter();
  }

  if ("export" in options.exporter) {
    return options.exporter;
  }

  return new HttpBatchExporter(options.exporter, options.project);
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
      const policy = mergePolicy(
        mergePolicy(defaultSessionPolicy, options.defaultPolicy),
        sessionOptions.policy,
      );
      const session = new RuntimeSession(
        options.project,
        {
          ...policy?.budget,
          ...sessionOptions.budget,
        },
        sessionOptions.metadata,
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
                  actualUsage as unknown as Record<string, unknown>,
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
            actualUsage as unknown as Record<string, unknown>,
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

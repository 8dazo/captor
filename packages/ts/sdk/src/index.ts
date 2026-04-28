import { defaultSessionPolicy, getCaptarEnvConfig } from '@captar/config';
import type {
  CaptarEvent,
  CaptarOptions,
  CaptarSession,
  ControlPlaneHook,
  Exporter,
  OpenAIWrapOptions,
  SessionPolicy,
  StartSessionOptions,
  ToolHandle,
  TrackToolOptions,
} from '@captar/types';
import { createId } from '@captar/utils';

import { BudgetExceededError, PolicyViolationError } from './internal/errors.js';
import { EventBus } from './internal/event-bus.js';
import { HttpBatchExporter, NoopExporter } from './internal/exporter.js';
import { OpenAIAdapter } from './internal/openai-adapter.js';
import { PolicyEngine } from './internal/policy-engine.js';
import { PricingRegistry } from './internal/pricing-registry.js';
import { RuntimeSession } from './internal/session.js';
import { createSpanSnapshot, updateSpanSnapshot } from './internal/span.js';
import { createTrackedTool } from './internal/tools.js';

export * from '@captar/types';
export { BudgetExceededError, PolicyViolationError };

export { eventToSpanRecord } from './internal/telemetry.js';

export interface CaptarInstance {
  /**
   * Subscribe to all Captar runtime events.
   * @param listener - Called for every event emitted during execution
   * @returns Unsubscribe function
   */
  onEvent(listener: (event: CaptarEvent) => void | Promise<void>): () => void;

  /**
   * Start a new budgeted session for a single conversation or tool execution.
   * @param sessionOptions - Override budgets, metadata, and policies for this session
   * @returns Active session ready for wrapping OpenAI or tracked tools
   */
  startSession(sessionOptions?: StartSessionOptions): Promise<CaptarSession>;

  /**
   * Wrap an OpenAI-compatible client with budget, policy, and span tracking.
   * @param client - The client to wrap (e.g. OpenAI.Chat.Completions)
   * @param wrapOptions - Session and optional per-call policy overrides
   * @returns The client with all methods instrumented
   */
  wrapOpenAI<TClient extends Record<string, unknown>>(
    client: TClient,
    wrapOptions: OpenAIWrapOptions
  ): TClient;

  /**
   * Create a tracked version of a tool function with guardrails and telemetry.
   * @param name - Tool name used in spans and policy matching
   * @param toolOptions - Handler, args schema, result schema, and optional policy
   * @returns Tracked tool handler (call `.run()` to execute)
   */
  trackTool<TArgs, TResult>(
    name: string,
    toolOptions: TrackToolOptions<TArgs, TResult>
  ): ToolHandle<TResult>;

  /**
   * Drain the internal exporter queue and wait for pending batches.
   */
  flush(): Promise<void>;
}

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

  if ('export' in options.exporter) {
    return options.exporter;
  }

  return new HttpBatchExporter(options.exporter, exporterProject, exporterHookId);
}

function mergePolicy(
  base: SessionPolicy | undefined,
  override: SessionPolicy | undefined
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

async function fetchControlPlanePolicy(options: CaptarOptions): Promise<SessionPolicy | undefined> {
  const controlPlane = options.controlPlane;
  if (!controlPlane?.syncPolicy) {
    return undefined;
  }

  const baseUrl = controlPlane.baseUrl ?? 'http://localhost:3000';
  const response = await fetch(
    `${baseUrl.replace(/\/$/, '')}/api/hooks/${controlPlane.hookId}/policy`,
    {
      headers: {
        ...(controlPlane.apiKey ? { authorization: `Bearer ${controlPlane.apiKey}` } : {}),
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to load control-plane policy for ${controlPlane.hookId}.`);
  }

  const payload = (await response.json()) as { hook: ControlPlaneHook };
  return payload.hook.policy;
}

function isBlockedExecutionError(error: unknown): boolean {
  return error instanceof PolicyViolationError || error instanceof BudgetExceededError;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

/**
 * Create a Captar runtime instance with budget tracking, policy enforcement, and telemetry export.
 * @param options - Global project config, control plane, exporter, and default policies
 * @returns Captar instance for sessions, OpenAI wrapping, and tool tracking
 */
export function createCaptar(options: CaptarOptions): CaptarInstance {
  const bus = new EventBus();
  const exporter = createExporter(options);
  const pricingRegistry = new PricingRegistry(
    options.pricing ?? 'builtin',
    options.pricingOverrides
  );

  return {
    onEvent(listener: (event: Parameters<typeof bus.emit>[0]) => void | Promise<void>) {
      return bus.subscribe(listener);
    },

    async startSession(sessionOptions: StartSessionOptions = {}): Promise<CaptarSession> {
      const remotePolicy = await fetchControlPlanePolicy(options);
      const policy = mergePolicy(
        mergePolicy(mergePolicy(defaultSessionPolicy, options.defaultPolicy), remotePolicy),
        sessionOptions.policy
      );
      const metadata = {
        ...sessionOptions.metadata,
        ...(options.controlPlane ? { _captarHookId: options.controlPlane.hookId } : {}),
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
        exporter as HttpBatchExporter | NoopExporter
      );
      await session.initialize();
      return session;
    },

    wrapOpenAI<TClient extends Record<string, any>>(
      client: TClient,
      wrapOptions: OpenAIWrapOptions
    ): TClient {
      const session = wrapOptions.session as RuntimeSession;
      const policy = mergePolicy(session.policy, wrapOptions.policy);
      const policyEngine = new PolicyEngine();

      const wrapMethod = (
        namespace: string,
        methodName: string,
        invoke: (request: Record<string, unknown>) => Promise<any>
      ) => {
        return async (request: Record<string, unknown>) => {
          const adapter = new OpenAIAdapter(pricingRegistry, invoke, policy?.call?.timeoutMs);
          const estimate = await adapter.estimate(request);
          const requestId = createId('req');
          const requestSpan = createSpanSnapshot({
            parentId: session.trace.spanId,
            name: `${namespace}.${methodName}`,
            kind: 'request',
            attributes: {
              provider: 'openai',
              model: estimate.model,
              namespace,
              methodName,
              requestId,
              stream: Boolean(request.stream),
            },
          });
          let reservedUsd = 0;
          session.markRequest(false);
          await session.emit(
            'request.started',
            {
              provider: 'openai',
              model: estimate.model,
              requestId,
              namespace,
              methodName,
              request,
            },
            {
              spanId: requestSpan.id,
              parentSpanId: requestSpan.parentId,
              span: requestSpan,
            }
          );

          try {
            policyEngine.evaluateCall(request, policy, estimate.estimatedCostUsd);
            await session.emit(
              'request.allowed',
              {
                provider: 'openai',
                model: estimate.model,
                estimatedCostUsd: estimate.estimatedCostUsd,
              },
              {
                spanId: requestSpan.id,
                parentSpanId: requestSpan.parentId,
                span: requestSpan,
              }
            );

            reservedUsd = session.reserve(estimate.estimatedCostUsd, {
              label: methodName,
            });
            await session.emit(
              'estimate.reserved',
              {
                provider: 'openai',
                model: estimate.model,
                reservedUsd,
              },
              {
                spanId: requestSpan.id,
                parentSpanId: requestSpan.parentId,
                span: requestSpan,
              }
            );

            const response = await adapter.execute(request);

            if (
              request.stream &&
              typeof response === 'object' &&
              response !== null &&
              Symbol.asyncIterator in response
            ) {
              const chunks: Array<Partial<Record<string, number>>> = [];
              const stream = response as unknown as AsyncIterable<Record<string, unknown>>;
              const wrapped = {
                async *[Symbol.asyncIterator]() {
                  try {
                    for await (const chunk of stream) {
                      const usage = chunk.usage;
                      if (usage && typeof usage === 'object') {
                        chunks.push(usage as Partial<Record<string, number>>);
                      }
                      yield chunk;
                    }
                  } catch (error) {
                    const endedAt = new Date().toISOString();
                    const failedSpan = updateSpanSnapshot(requestSpan, {
                      status: 'failed',
                      endedAt,
                      attributes: {
                        error: errorMessage(error),
                      },
                    });

                    if (reservedUsd > 0) {
                      const reconciliation = session.commit(reservedUsd, 0);
                      reservedUsd = 0;
                      await session.emit(
                        'spend.committed',
                        {
                          provider: 'openai',
                          model: estimate.model,
                          actualCostUsd: reconciliation.actualUsd,
                          releasedUsd: reconciliation.releasedUsd,
                        },
                        {
                          spanId: requestSpan.id,
                          parentSpanId: requestSpan.parentId,
                          span: failedSpan,
                        }
                      );
                    }

                    await session.emit(
                      'request.failed',
                      {
                        reason: errorMessage(error),
                        provider: 'openai',
                        model: estimate.model,
                      },
                      {
                        spanId: requestSpan.id,
                        parentSpanId: requestSpan.parentId,
                        span: failedSpan,
                      }
                    );
                    throw error;
                  }

                  const endedAt = new Date().toISOString();
                  const actualUsage = adapter.extractStreamUsage(
                    estimate.model,
                    chunks,
                    estimate.estimatedCostUsd
                  );
                  const completedSpan = updateSpanSnapshot(requestSpan, {
                    status: 'completed',
                    endedAt,
                    attributes: {
                      model: actualUsage.model,
                      inputTokens: actualUsage.inputTokens ?? null,
                      outputTokens: actualUsage.outputTokens ?? null,
                      cachedInputTokens: actualUsage.cachedInputTokens ?? null,
                      costUsd: actualUsage.costUsd,
                    },
                  });
                  const reconciliation = session.commit(reservedUsd, actualUsage.costUsd);
                  reservedUsd = 0;
                  await session.emit(
                    'provider.response',
                    {
                      ...actualUsage,
                      response,
                    } as unknown as Record<string, unknown>,
                    {
                      spanId: requestSpan.id,
                      parentSpanId: requestSpan.parentId,
                      span: completedSpan,
                    }
                  );
                  await session.emit(
                    'spend.committed',
                    {
                      provider: 'openai',
                      model: actualUsage.model,
                      actualCostUsd: reconciliation.actualUsd,
                      releasedUsd: reconciliation.releasedUsd,
                    },
                    {
                      spanId: requestSpan.id,
                      parentSpanId: requestSpan.parentId,
                      span: completedSpan,
                    }
                  );
                },
              };

              return wrapped;
            }

            const endedAt = new Date().toISOString();
            const actualUsage = adapter.extractUsage(
              response as Record<string, unknown>,
              estimate.estimatedCostUsd
            );
            const completedSpan = updateSpanSnapshot(requestSpan, {
              status: 'completed',
              endedAt,
              attributes: {
                model: actualUsage.model,
                inputTokens: actualUsage.inputTokens ?? null,
                outputTokens: actualUsage.outputTokens ?? null,
                cachedInputTokens: actualUsage.cachedInputTokens ?? null,
                costUsd: actualUsage.costUsd,
              },
            });
            const reconciliation = session.commit(reservedUsd, actualUsage.costUsd);
            reservedUsd = 0;
            await session.emit(
              'provider.response',
              {
                ...actualUsage,
                response,
              } as unknown as Record<string, unknown>,
              {
                spanId: requestSpan.id,
                parentSpanId: requestSpan.parentId,
                span: completedSpan,
              }
            );
            await session.emit(
              'spend.committed',
              {
                provider: 'openai',
                model: actualUsage.model,
                actualCostUsd: reconciliation.actualUsd,
                releasedUsd: reconciliation.releasedUsd,
              },
              {
                spanId: requestSpan.id,
                parentSpanId: requestSpan.parentId,
                span: completedSpan,
              }
            );
            return response;
          } catch (error) {
            const endedAt = new Date().toISOString();
            const blocked = isBlockedExecutionError(error);
            const finalSpan = updateSpanSnapshot(requestSpan, {
              status: blocked ? 'blocked' : 'failed',
              endedAt,
              attributes: {
                error: errorMessage(error),
              },
            });

            if (reservedUsd > 0) {
              const reconciliation = session.commit(reservedUsd, 0);
              reservedUsd = 0;
              await session.emit(
                'spend.committed',
                {
                  provider: 'openai',
                  model: estimate.model,
                  actualCostUsd: reconciliation.actualUsd,
                  releasedUsd: reconciliation.releasedUsd,
                },
                {
                  spanId: requestSpan.id,
                  parentSpanId: requestSpan.parentId,
                  span: finalSpan,
                }
              );
            }

            if (blocked) {
              session.markRequest(true);
              await session.emit(
                'request.blocked',
                {
                  reason: error instanceof Error ? error.message : 'blocked',
                  provider: 'openai',
                  model: estimate.model,
                },
                {
                  spanId: requestSpan.id,
                  parentSpanId: requestSpan.parentId,
                  span: finalSpan,
                }
              );
              throw error;
            }

            await session.emit(
              'request.failed',
              {
                reason: errorMessage(error),
                provider: 'openai',
                model: estimate.model,
              },
              {
                spanId: requestSpan.id,
                parentSpanId: requestSpan.parentId,
                span: finalSpan,
              }
            );
            throw error;
          }
        };
      };

      const wrapped = {
        ...client,
        responses: {
          ...client.responses,
          create: wrapMethod('responses', 'create', (request) => client.responses.create(request)),
        },
        chat: {
          ...client.chat,
          completions: {
            ...client.chat?.completions,
            create: wrapMethod('chat.completions', 'create', (request) =>
              client.chat.completions.create(request)
            ),
          },
        },
      };

      return wrapped;
    },

    trackTool<TArgs, TResult>(name: string, toolOptions: TrackToolOptions<TArgs, TResult>) {
      return createTrackedTool(name, toolOptions, new PolicyEngine());
    },

    async flush(): Promise<void> {
      if ('flush' in exporter && exporter.flush) {
        await exporter.flush();
      }
    },
  };
}

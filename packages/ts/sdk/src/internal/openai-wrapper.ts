import type { CaptarEvent, CaptarOptions, EstimateResult, SessionPolicy } from '@captar/types';
import { createId } from '@captar/utils';

import type { BudgetReconciliation } from './budget-engine.js';
import { BudgetPlanner, type OutputTokenField } from './budget-planner.js';
import { BudgetExceededError, PolicyViolationError } from './errors.js';
import { OpenAIAdapter } from './openai-adapter.js';
import type { PricingRegistry } from './pricing-registry.js';
import type { RuntimeSession } from './session.js';
import { createSpanSnapshot, updateSpanSnapshot } from './span.js';

type AnyRecord = Record<string, any>;
type OpenAIRequest = Record<string, unknown>;
type ProviderInvoke = (...args: any[]) => Promise<any>;

export interface OpenAIWrapperContext {
  session: RuntimeSession;
  policy?: SessionPolicy;
  provider: string;
  pricingRegistry: PricingRegistry;
  onBudgetExceeded?: CaptarOptions['onBudgetExceeded'];
  onPolicyViolation?: CaptarOptions['onPolicyViolation'];
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function isAbortSignalLike(value: unknown): value is AbortSignal {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AbortSignal>;
  return (
    typeof candidate.aborted === 'boolean' &&
    typeof candidate.addEventListener === 'function' &&
    typeof candidate.removeEventListener === 'function'
  );
}

function requestOptionsFromArgs(args: any[]): Record<string, unknown> | undefined {
  return objectRecord(args[1]);
}

async function invokeWithCancellation(
  invoke: ProviderInvoke,
  args: any[],
  timeoutMs: number | undefined,
): Promise<any> {
  if (typeof timeoutMs !== 'number' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return await invoke(...args);
  }

  const existingOptions = requestOptionsFromArgs(args) ?? {};
  const existingSignal = existingOptions.signal;
  const controller = new AbortController();

  const forwardAbort = () => {
    if (isAbortSignalLike(existingSignal)) {
      controller.abort(existingSignal.reason);
    }
  };

  if (isAbortSignalLike(existingSignal)) {
    if (existingSignal.aborted) {
      forwardAbort();
    } else {
      existingSignal.addEventListener('abort', forwardAbort, { once: true });
    }
  }

  const timer = setTimeout(() => {
    controller.abort(new Error(`Captar provider timeout after ${timeoutMs}ms.`));
  }, timeoutMs);

  const nextOptions = {
    ...existingOptions,
    signal: controller.signal,
  };
  const nextArgs = requestOptionsFromArgs(args)
    ? [args[0], nextOptions, ...args.slice(2)]
    : [args[0], nextOptions, ...args.slice(1)];

  try {
    return await invoke(...nextArgs);
  } finally {
    clearTimeout(timer);
    if (isAbortSignalLike(existingSignal) && !existingSignal.aborted) {
      existingSignal.removeEventListener('abort', forwardAbort);
    }
  }
}

function resolveOutputField(
  namespace: string,
  provider: string,
  request: OpenAIRequest,
): OutputTokenField {
  if (namespace === 'responses') {
    return 'max_output_tokens';
  }

  if (typeof request.max_completion_tokens === 'number') {
    return 'max_completion_tokens';
  }
  if (typeof request.max_tokens === 'number') {
    return 'max_tokens';
  }

  return provider === 'openai' ? 'max_completion_tokens' : 'max_tokens';
}

function ensureStreamingUsage(
  namespace: string,
  provider: string,
  request: OpenAIRequest,
): OpenAIRequest {
  if (
    namespace !== 'chat.completions' ||
    provider !== 'openai' ||
    request.stream !== true
  ) {
    return request;
  }

  return {
    ...request,
    stream_options: {
      ...objectRecord(request.stream_options),
      include_usage: true,
    },
  };
}

function streamHasProviderUsage(chunks: Array<Record<string, unknown>>): boolean {
  return chunks.some((chunk) => {
    if (objectRecord(chunk.usage)) return true;
    return Boolean(objectRecord(objectRecord(chunk.response)?.usage));
  });
}

function isBlockedExecutionError(error: unknown): boolean {
  return error instanceof PolicyViolationError || error instanceof BudgetExceededError;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}

function emptyEstimate(provider: string, model: string): EstimateResult {
  return {
    provider,
    model,
    estimatedInputTokens: 0,
    estimatedOutputTokens: 0,
    estimatedCostUsd: 0,
  };
}

async function emitSpendReconciliation(
  session: RuntimeSession,
  reconciliation: BudgetReconciliation,
  provider: string,
  model: string,
  span: CaptarEvent['span'],
): Promise<void> {
  const eventOptions = {
    spanId: span?.id,
    parentSpanId: span?.parentId,
    span,
  };

  await session.emit(
    'spend.committed',
    {
      provider,
      model,
      actualCostUsd: reconciliation.actualUsd,
      releasedUsd: reconciliation.releasedUsd,
      reservationOverrunUsd: reconciliation.reservationOverrunUsd,
      hardBudgetOverrunUsd: reconciliation.hardBudgetOverrunUsd,
    },
    eventOptions,
  );

  if (reconciliation.reservationOverrunUsd <= 0 && reconciliation.hardBudgetOverrunUsd <= 0) {
    return;
  }

  const message =
    reconciliation.hardBudgetOverrunUsd > 0
      ? `Provider-reported spend exceeded the hard session budget by $${reconciliation.hardBudgetOverrunUsd.toFixed(6)}.`
      : `Provider-reported spend exceeded the reserved amount by $${reconciliation.reservationOverrunUsd.toFixed(6)}.`;

  await session.emit(
    'guardrail.violation',
    {
      category: 'spend',
      message,
      provider,
      model,
      reservationOverrunUsd: reconciliation.reservationOverrunUsd,
      hardBudgetOverrunUsd: reconciliation.hardBudgetOverrunUsd,
    },
    eventOptions,
  );
}

function proxyWithOverrides<T extends object>(
  target: T,
  overrides: Map<PropertyKey, unknown>,
): T {
  const boundMethods = new Map<PropertyKey, unknown>();

  return new Proxy(target, {
    get(resource, property) {
      if (overrides.has(property)) {
        return overrides.get(property);
      }

      const value = Reflect.get(resource, property, resource);
      if (typeof value !== 'function') {
        return value;
      }

      if (!boundMethods.has(property)) {
        boundMethods.set(property, value.bind(resource));
      }
      return boundMethods.get(property);
    },
  });
}

export function createOpenAIWrapper<TClient extends AnyRecord>(
  client: TClient,
  context: OpenAIWrapperContext,
): TClient {
  const {
    session,
    policy,
    provider,
    pricingRegistry,
    onBudgetExceeded,
    onPolicyViolation,
  } = context;
  const planner = new BudgetPlanner(pricingRegistry, provider);

  const wrapMethod = (
    namespace: string,
    methodName: string,
    invoke: ProviderInvoke,
  ) => {
    return async (...args: any[]) => {
      const request = objectRecord(args[0]) ?? {};
      const requestOptions = requestOptionsFromArgs(args);
      const requestedModel = typeof request.model === 'string' ? request.model : 'unknown';
      const requestId = createId('req');
      const requestSpan = createSpanSnapshot({
        parentId: session.trace.spanId,
        name: `${namespace}.${methodName}`,
        kind: 'request',
        attributes: {
          provider,
          model: requestedModel,
          namespace,
          methodName,
          requestId,
          stream: Boolean(request.stream),
        },
      });
      const adapter = new OpenAIAdapter(
        pricingRegistry,
        async (providerRequest) =>
          (await invokeWithCancellation(
            invoke,
            [providerRequest, ...args.slice(1)],
            policy?.call?.timeoutMs,
          )) as Record<string, unknown>,
        provider,
      );
      let estimate = emptyEstimate(provider, requestedModel);
      let executionRequest = request;
      let reservedUsd = 0;
      let releaseRequestSlot: (() => void) | undefined;
      let streamOwnsRequestSlot = false;

      await session.emit(
        'request.started',
        {
          provider,
          model: requestedModel,
          requestId,
          namespace,
          methodName,
          request,
        },
        {
          spanId: requestSpan.id,
          parentSpanId: requestSpan.parentId,
          span: requestSpan,
        },
      );

      try {
        const plan = planner.plan(request, {
          remainingUsd: session.getState().remainingUsd,
          protectedReserveUsd: session.budget.finalizationReserveUsd,
          policyMaxOutputTokens: policy?.call?.maxOutputTokens,
          outputField: resolveOutputField(namespace, provider, request),
        });
        estimate = plan.estimate;
        executionRequest = ensureStreamingUsage(namespace, provider, plan.request);

        session.policyEngine.evaluateCall(
          request,
          policy,
          estimate.estimatedCostUsd,
          requestOptions,
        );
        releaseRequestSlot = session.acquireRequestSlot(policy?.call);

        await session.emit(
          'request.allowed',
          {
            provider,
            model: estimate.model,
            estimatedCostUsd: estimate.estimatedCostUsd,
            enforcedOutputTokens: plan.enforcedOutputTokens,
            spendableUsd: plan.spendableUsd,
          },
          {
            spanId: requestSpan.id,
            parentSpanId: requestSpan.parentId,
            span: requestSpan,
          },
        );

        reservedUsd = session.reserve(estimate.estimatedCostUsd, { label: methodName });
        await session.emit(
          'estimate.reserved',
          {
            provider,
            model: estimate.model,
            reservedUsd,
            enforcedOutputTokens: plan.enforcedOutputTokens,
          },
          {
            spanId: requestSpan.id,
            parentSpanId: requestSpan.parentId,
            span: requestSpan,
          },
        );

        const response = await adapter.execute(executionRequest);

        if (
          executionRequest.stream &&
          typeof response === 'object' &&
          response !== null &&
          Symbol.asyncIterator in response
        ) {
          const chunks: Array<Record<string, unknown>> = [];
          const stream = response as unknown as AsyncIterable<Record<string, unknown>>;
          streamOwnsRequestSlot = true;

          return {
            async *[Symbol.asyncIterator]() {
              let finalized = false;
              try {
                for await (const chunk of stream) {
                  chunks.push(chunk);
                  yield chunk;
                }

                const endedAt = new Date().toISOString();
                const actualUsage = adapter.extractStreamUsage(
                  estimate.model,
                  chunks,
                  estimate.estimatedCostUsd,
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
                finalized = true;
                await session.emit(
                  'provider.response',
                  {
                    ...actualUsage,
                    stream: true,
                    usageSource: streamHasProviderUsage(chunks) ? 'provider' : 'estimated',
                  },
                  {
                    spanId: requestSpan.id,
                    parentSpanId: requestSpan.parentId,
                    span: completedSpan,
                  },
                );
                await emitSpendReconciliation(
                  session,
                  reconciliation,
                  provider,
                  actualUsage.model,
                  completedSpan,
                );
              } catch (error) {
                const endedAt = new Date().toISOString();
                const failedSpan = updateSpanSnapshot(requestSpan, {
                  status: 'failed',
                  endedAt,
                  attributes: { error: errorMessage(error) },
                });
                if (reservedUsd > 0) {
                  const reconciliation = session.commit(reservedUsd, reservedUsd);
                  reservedUsd = 0;
                  await emitSpendReconciliation(
                    session,
                    reconciliation,
                    provider,
                    estimate.model,
                    failedSpan,
                  );
                }
                finalized = true;
                await session.emit(
                  'request.failed',
                  {
                    reason: errorMessage(error),
                    provider,
                    model: estimate.model,
                    usageSource: 'unresolved',
                  },
                  {
                    spanId: requestSpan.id,
                    parentSpanId: requestSpan.parentId,
                    span: failedSpan,
                  },
                );
                throw error;
              } finally {
                if (!finalized && reservedUsd > 0) {
                  const cancelledSpan = updateSpanSnapshot(requestSpan, {
                    status: 'failed',
                    endedAt: new Date().toISOString(),
                    attributes: { error: 'stream cancelled before usage reconciliation' },
                  });
                  const reconciliation = session.commit(reservedUsd, reservedUsd);
                  reservedUsd = 0;
                  await emitSpendReconciliation(
                    session,
                    reconciliation,
                    provider,
                    estimate.model,
                    cancelledSpan,
                  );
                  await session.emit(
                    'request.failed',
                    {
                      reason: 'stream cancelled before usage reconciliation',
                      provider,
                      model: estimate.model,
                      usageSource: 'unresolved',
                    },
                    {
                      spanId: requestSpan.id,
                      parentSpanId: requestSpan.parentId,
                      span: cancelledSpan,
                    },
                  );
                }
                releaseRequestSlot?.();
                releaseRequestSlot = undefined;
              }
            },
          };
        }

        const endedAt = new Date().toISOString();
        const actualUsage = adapter.extractUsage(
          response as Record<string, unknown>,
          estimate.estimatedCostUsd,
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
          { ...actualUsage, response } as unknown as Record<string, unknown>,
          {
            spanId: requestSpan.id,
            parentSpanId: requestSpan.parentId,
            span: completedSpan,
          },
        );
        await emitSpendReconciliation(
          session,
          reconciliation,
          provider,
          actualUsage.model,
          completedSpan,
        );
        return response;
      } catch (error) {
        const endedAt = new Date().toISOString();
        const blocked = isBlockedExecutionError(error);
        const finalSpan = updateSpanSnapshot(requestSpan, {
          status: blocked ? 'blocked' : 'failed',
          endedAt,
          attributes: { error: errorMessage(error) },
        });

        if (reservedUsd > 0) {
          const reconciliation = session.commit(reservedUsd, 0);
          reservedUsd = 0;
          await emitSpendReconciliation(
            session,
            reconciliation,
            provider,
            estimate.model,
            finalSpan,
          );
        }

        if (blocked) {
          session.markRequest(true);
          await session.emit(
            'request.blocked',
            {
              reason: error instanceof Error ? error.message : 'blocked',
              provider,
              model: estimate.model,
            },
            {
              spanId: requestSpan.id,
              parentSpanId: requestSpan.parentId,
              span: finalSpan,
            },
          );
          if (error instanceof BudgetExceededError && onBudgetExceeded) {
            onBudgetExceeded({
              sessionId: session.id,
              budgetUsd: session.budget.maxSpendUsd ?? session.getSummary().totalReservedUsd,
              attemptedUsd: estimate.estimatedCostUsd,
            });
          }
          if (error instanceof PolicyViolationError && onPolicyViolation) {
            onPolicyViolation({
              sessionId: session.id,
              reason: error.message,
              type: 'blocked',
            });
          }
          throw error;
        }

        await session.emit(
          'request.failed',
          {
            reason: errorMessage(error),
            provider,
            model: estimate.model,
          },
          {
            spanId: requestSpan.id,
            parentSpanId: requestSpan.parentId,
            span: finalSpan,
          },
        );
        throw error;
      } finally {
        if (!streamOwnsRequestSlot) {
          releaseRequestSlot?.();
          releaseRequestSlot = undefined;
        }
      }
    };
  };

  const rootOverrides = new Map<PropertyKey, unknown>();

  const responses = client.responses;
  if (responses && typeof responses === 'object' && typeof responses.create === 'function') {
    rootOverrides.set(
      'responses',
      proxyWithOverrides(
        responses,
        new Map<PropertyKey, unknown>([
          [
            'create',
            wrapMethod('responses', 'create', (...args) =>
              responses.create.apply(responses, args),
            ),
          ],
        ]),
      ),
    );
  }

  const chat = client.chat;
  const completions = chat?.completions;
  if (chat && typeof chat === 'object' && completions && typeof completions === 'object') {
    const chatOverrides = new Map<PropertyKey, unknown>();
    if (typeof completions.create === 'function') {
      chatOverrides.set(
        'completions',
        proxyWithOverrides(
          completions,
          new Map<PropertyKey, unknown>([
            [
              'create',
              wrapMethod('chat.completions', 'create', (...args) =>
                completions.create.apply(completions, args),
              ),
            ],
          ]),
        ),
      );
    }
    rootOverrides.set('chat', proxyWithOverrides(chat, chatOverrides));
  }

  return proxyWithOverrides(client, rootOverrides) as TClient;
}

type OpenAIRequest = Record<string, unknown>;

export interface ProviderChargeContext {
  toolCostPerCallUsd: Readonly<Record<string, number>>;
}

export interface ProviderChargeEstimate {
  hostedToolTypes: string[];
  maxToolCalls?: number;
  estimatedCostUsd: number;
  missingPricing: string[];
  requiresToolCallCeiling: boolean;
}

export const PROVIDER_CHARGE_CONTEXT = Symbol('captar.providerChargeContext');

const LOCAL_TOOL_TYPES = new Set(['function', 'custom']);

function asObject(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function toolTypes(request: OpenAIRequest): string[] {
  if (!Array.isArray(request.tools)) return [];

  const result = new Set<string>();
  for (const tool of request.tools) {
    const record = asObject(tool);
    const type = typeof record?.type === 'string' ? record.type.trim() : '';
    if (type && !LOCAL_TOOL_TYPES.has(type)) {
      result.add(type);
    }
  }
  return Array.from(result);
}

export function validateProviderToolCosts(
  costs: Readonly<Record<string, number>> | undefined,
): Readonly<Record<string, number>> {
  if (!costs) return {};

  const normalized: Record<string, number> = {};
  for (const [rawType, cost] of Object.entries(costs)) {
    const type = rawType.trim();
    if (!type) {
      throw new RangeError('Provider tool pricing keys must be non-empty tool types.');
    }
    if (!Number.isFinite(cost) || cost < 0) {
      throw new RangeError(
        `Provider tool price for "${type}" must be a finite non-negative USD value.`,
      );
    }
    normalized[type] = cost;
  }
  return normalized;
}

export function attachProviderChargeContext(
  request: OpenAIRequest,
  toolCostPerCallUsd: Readonly<Record<string, number>>,
): OpenAIRequest {
  return {
    ...request,
    [PROVIDER_CHARGE_CONTEXT]: {
      toolCostPerCallUsd,
    } satisfies ProviderChargeContext,
  };
}

export function stripProviderChargeContext(request: OpenAIRequest): OpenAIRequest {
  const clean: OpenAIRequest = {};
  for (const key of Reflect.ownKeys(request)) {
    if (key === PROVIDER_CHARGE_CONTEXT) continue;
    const descriptor = Object.getOwnPropertyDescriptor(request, key);
    if (descriptor?.enumerable && typeof key === 'string') {
      clean[key] = request[key];
    }
  }
  return clean;
}

export function estimateProviderCharges(request: OpenAIRequest): ProviderChargeEstimate {
  const hostedToolTypes = toolTypes(request);
  if (hostedToolTypes.length === 0) {
    return {
      hostedToolTypes,
      estimatedCostUsd: 0,
      missingPricing: [],
      requiresToolCallCeiling: false,
    };
  }

  const context = (request as Record<PropertyKey, unknown>)[
    PROVIDER_CHARGE_CONTEXT
  ] as ProviderChargeContext | undefined;
  const configuredCosts = context?.toolCostPerCallUsd ?? {};
  const missingPricing = hostedToolTypes.filter(
    (type) => typeof configuredCosts[type] !== 'number',
  );
  const knownCosts = hostedToolTypes
    .map((type) => configuredCosts[type])
    .filter((value): value is number => typeof value === 'number');
  const maxCostPerCallUsd = knownCosts.length > 0 ? Math.max(...knownCosts) : 0;
  const rawMaxToolCalls = request.max_tool_calls;
  const maxToolCalls =
    typeof rawMaxToolCalls === 'number' &&
    Number.isInteger(rawMaxToolCalls) &&
    rawMaxToolCalls >= 0
      ? rawMaxToolCalls
      : undefined;
  const requiresToolCallCeiling = maxCostPerCallUsd > 0 && maxToolCalls === undefined;

  return {
    hostedToolTypes,
    maxToolCalls,
    estimatedCostUsd:
      maxToolCalls === undefined ? 0 : maxToolCalls * maxCostPerCallUsd,
    missingPricing,
    requiresToolCallCeiling,
  };
}

function proxyResourceCreate<T extends object>(
  resource: T,
  toolCostPerCallUsd: Readonly<Record<string, number>>,
): T {
  let wrappedCreate: unknown;
  return new Proxy(resource, {
    get(target, property, receiver) {
      if (property !== 'create') {
        return Reflect.get(target, property, receiver);
      }
      if (wrappedCreate !== undefined) return wrappedCreate;

      const create = Reflect.get(target, property, receiver);
      if (typeof create !== 'function') return create;
      wrappedCreate = (request: unknown, ...args: unknown[]) =>
        create(
          attachProviderChargeContext(asObject(request) ?? {}, toolCostPerCallUsd),
          ...args,
        );
      return wrappedCreate;
    },
  });
}

/**
 * Adds internal non-token charge metadata before Captar's existing create()
 * interceptor sees a request. Symbols never reach JSON provider payloads, and the
 * adapter removes the metadata before invoking the provider for custom clients.
 */
export function governProviderCharges<TClient extends Record<string, any>>(
  client: TClient,
  costs?: Readonly<Record<string, number>>,
): TClient {
  const toolCostPerCallUsd = validateProviderToolCosts(costs);
  let responses: unknown;
  let chat: unknown;

  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === 'responses') {
        const resource = Reflect.get(target, property, receiver);
        if (!resource || typeof resource !== 'object') return resource;
        responses ??= proxyResourceCreate(resource, toolCostPerCallUsd);
        return responses;
      }

      if (property === 'chat') {
        const resource = Reflect.get(target, property, receiver);
        if (!resource || typeof resource !== 'object') return resource;
        if (chat !== undefined) return chat;

        let completions: unknown;
        chat = new Proxy(resource, {
          get(chatTarget, chatProperty, chatReceiver) {
            if (chatProperty !== 'completions') {
              return Reflect.get(chatTarget, chatProperty, chatReceiver);
            }
            const completionResource = Reflect.get(chatTarget, chatProperty, chatReceiver);
            if (!completionResource || typeof completionResource !== 'object') {
              return completionResource;
            }
            completions ??= proxyResourceCreate(completionResource, toolCostPerCallUsd);
            return completions;
          },
        });
        return chat;
      }

      return Reflect.get(target, property, receiver);
    },
  }) as TClient;
}

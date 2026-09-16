type AnyRecord = Record<string, any>;
type HelperPromise<T = unknown> = Promise<T> & {
  _thenUnwrap?: (
    transform: (data: T, props: unknown) => unknown,
  ) => HelperPromise<unknown>;
};

const RESPONSES_HELPERS = new Set<PropertyKey>(['parse', 'stream']);
const CHAT_COMPLETION_HELPERS = new Set<PropertyKey>(['parse', 'stream', 'runTools']);

function findPrototypeMethod(target: object, property: PropertyKey): Function | undefined {
  let prototype = Object.getPrototypeOf(target);
  while (prototype) {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, property);
    if (typeof descriptor?.value === 'function') {
      return descriptor.value;
    }
    prototype = Object.getPrototypeOf(prototype);
  }
  return undefined;
}

function decorateHelperPromise<T>(value: PromiseLike<T> | T): HelperPromise<T> {
  const promise = Promise.resolve(value) as HelperPromise<T>;
  promise._thenUnwrap = (transform) =>
    decorateHelperPromise(promise.then((data) => transform(data, {})));
  return promise;
}

function createHelperCreateResource<T extends object>(resource: T): T {
  let wrappedCreate: unknown;

  return new Proxy(resource, {
    get(target, property, receiver) {
      if (property !== 'create') {
        return Reflect.get(target, property, receiver);
      }

      if (wrappedCreate !== undefined) {
        return wrappedCreate;
      }

      const create = Reflect.get(target, property, receiver);
      if (typeof create !== 'function') {
        return create;
      }

      wrappedCreate = (...args: unknown[]) => decorateHelperPromise(create(...args));
      return wrappedCreate;
    },
  });
}

function createHelperReceiver<T extends object>(
  resource: T,
  getHelperClient: () => AnyRecord,
): T {
  return new Proxy(resource, {
    get(target, property, receiver) {
      if (property === '_client') {
        return getHelperClient();
      }
      return Reflect.get(target, property, receiver);
    },
  });
}

function createHelperAwareResource<T extends object>(
  resource: T,
  helperMethods: ReadonlySet<PropertyKey>,
  getHelperClient: () => AnyRecord,
): T {
  const helpers = new Map<PropertyKey, unknown>();
  const helperReceiver = createHelperReceiver(resource, getHelperClient);

  return new Proxy(resource, {
    get(target, property, receiver) {
      if (!helperMethods.has(property)) {
        return Reflect.get(target, property, receiver);
      }

      if (helpers.has(property)) {
        return helpers.get(property);
      }

      const method = findPrototypeMethod(target, property);
      if (!method) {
        // Unknown/custom clients keep their existing helper behavior instead of
        // being rebound speculatively. Official OpenAI helpers live on resource
        // prototypes, which is the surface this compatibility layer targets.
        return Reflect.get(target, property, receiver);
      }

      const governedHelper = (...args: unknown[]) => method.apply(helperReceiver, args);
      helpers.set(property, governedHelper);
      return governedHelper;
    },
  });
}

/**
 * OpenAI convenience helpers keep a reference to their originating client and
 * internally issue one or more `.create()` calls through that client. Captar's
 * resource proxy must therefore give those helpers a client whose create methods
 * point back through Captar enforcement, while preserving every unrelated method
 * on the real OpenAI resources.
 */
export function governOpenAIHelpers<TClient extends AnyRecord>(client: TClient): TClient {
  let governedClient: TClient;
  let helperClient: AnyRecord;
  let governedResponses: unknown;
  let governedChat: unknown;
  let helperResponses: unknown;
  let helperChat: unknown;

  const getHelperClient = () => helperClient;

  governedClient = new Proxy(client, {
    get(target, property, receiver) {
      if (property === 'responses') {
        const responses = Reflect.get(target, property, receiver);
        if (!responses || typeof responses !== 'object') return responses;
        governedResponses ??= createHelperAwareResource(
          responses,
          RESPONSES_HELPERS,
          getHelperClient,
        );
        return governedResponses;
      }

      if (property === 'chat') {
        const chat = Reflect.get(target, property, receiver);
        if (!chat || typeof chat !== 'object') return chat;
        if (governedChat !== undefined) return governedChat;

        let governedCompletions: unknown;
        governedChat = new Proxy(chat, {
          get(chatTarget, chatProperty, chatReceiver) {
            if (chatProperty !== 'completions') {
              return Reflect.get(chatTarget, chatProperty, chatReceiver);
            }
            const completions = Reflect.get(chatTarget, chatProperty, chatReceiver);
            if (!completions || typeof completions !== 'object') return completions;
            governedCompletions ??= createHelperAwareResource(
              completions,
              CHAT_COMPLETION_HELPERS,
              getHelperClient,
            );
            return governedCompletions;
          },
        });
        return governedChat;
      }

      return Reflect.get(target, property, receiver);
    },
  }) as TClient;

  helperClient = new Proxy(governedClient, {
    get(target, property, receiver) {
      if (property === 'responses') {
        const responses = Reflect.get(target, property, receiver);
        if (!responses || typeof responses !== 'object') return responses;
        helperResponses ??= createHelperCreateResource(responses);
        return helperResponses;
      }

      if (property === 'chat') {
        const chat = Reflect.get(target, property, receiver);
        if (!chat || typeof chat !== 'object') return chat;
        if (helperChat !== undefined) return helperChat;

        let helperCompletions: unknown;
        helperChat = new Proxy(chat, {
          get(chatTarget, chatProperty, chatReceiver) {
            if (chatProperty !== 'completions') {
              return Reflect.get(chatTarget, chatProperty, chatReceiver);
            }
            const completions = Reflect.get(chatTarget, chatProperty, chatReceiver);
            if (!completions || typeof completions !== 'object') return completions;
            helperCompletions ??= createHelperCreateResource(completions);
            return helperCompletions;
          },
        });
        return helperChat;
      }

      return Reflect.get(target, property, receiver);
    },
  });

  return governedClient;
}

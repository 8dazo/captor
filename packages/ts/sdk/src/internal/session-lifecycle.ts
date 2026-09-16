import type { ToolHandle } from '@captar/types';

import type { RuntimeSession } from './session.js';

type AnyRecord = Record<string, any>;
type Invoke = (...args: any[]) => any;

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  return Boolean(
    value &&
      typeof value === 'object' &&
      Symbol.asyncIterator in (value as Record<PropertyKey, unknown>),
  );
}

function wrapStreamWithLease<T>(
  stream: AsyncIterable<T>,
  release: () => void,
): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      try {
        for await (const chunk of stream) {
          yield chunk;
        }
      } finally {
        release();
      }
    },
  };
}

function wrapCreateWithSessionLease(
  create: Invoke,
  receiver: object,
  session: RuntimeSession,
): Invoke {
  return async (...args: any[]) => {
    const release = session.acquireExecutionLease();
    let streamOwnsLease = false;

    try {
      const result = await create.apply(receiver, args);
      if (isAsyncIterable(result)) {
        streamOwnsLease = true;
        return wrapStreamWithLease(result, release);
      }
      return result;
    } finally {
      if (!streamOwnsLease) {
        release();
      }
    }
  };
}

function proxyResourceCreate<T extends object>(
  resource: T,
  session: RuntimeSession,
): T {
  let wrappedCreate: unknown;

  return new Proxy(resource, {
    get(target, property, receiver) {
      if (property !== 'create') {
        const value = Reflect.get(target, property, receiver);
        return typeof value === 'function' ? value.bind(target) : value;
      }

      if (wrappedCreate !== undefined) return wrappedCreate;
      const create = Reflect.get(target, property, target);
      if (typeof create !== 'function') return create;
      wrappedCreate = wrapCreateWithSessionLease(create, target, session);
      return wrappedCreate;
    },
  });
}

/**
 * Gate request-producing OpenAI resources before Captar emits request events.
 * A lease survives for the complete async stream lifetime so `session.close()`
 * cannot finalize the parent span while a child request is still reconciling.
 */
export function governSessionLifecycle<TClient extends AnyRecord>(
  client: TClient,
  session: RuntimeSession,
): TClient {
  let responses: unknown;
  let chat: unknown;

  return new Proxy(client, {
    get(target, property, receiver) {
      if (property === 'responses') {
        const resource = Reflect.get(target, property, receiver);
        if (!resource || typeof resource !== 'object') return resource;
        responses ??= proxyResourceCreate(resource, session);
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
              const value = Reflect.get(chatTarget, chatProperty, chatReceiver);
              return typeof value === 'function' ? value.bind(chatTarget) : value;
            }
            const completionResource = Reflect.get(
              chatTarget,
              chatProperty,
              chatReceiver,
            );
            if (!completionResource || typeof completionResource !== 'object') {
              return completionResource;
            }
            completions ??= proxyResourceCreate(completionResource, session);
            return completions;
          },
        });
        return chat;
      }

      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as TClient;
}

export function governToolLifecycle<TResult>(
  handle: ToolHandle<TResult>,
  session: RuntimeSession,
): ToolHandle<TResult> {
  return {
    async run(work: () => Promise<TResult>): Promise<TResult> {
      const release = session.acquireExecutionLease();
      try {
        return await handle.run(work);
      } finally {
        release();
      }
    },
  };
}

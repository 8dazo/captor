import { ExecutionRun } from './index.js';

export interface BoundedFetchOptions {
  fetch?: typeof globalThis.fetch;
  resource?: string;
  amount?: number;
}

function combineSignals(runSignal: AbortSignal, callerSignal?: AbortSignal | null): AbortSignal {
  if (!callerSignal) return runSignal;
  if (runSignal.aborted) return runSignal;
  if (callerSignal.aborted) return callerSignal;

  const controller = new AbortController();
  const abortFromRun = () => controller.abort(runSignal.reason);
  const abortFromCaller = () => controller.abort(callerSignal.reason);

  runSignal.addEventListener('abort', abortFromRun, { once: true });
  callerSignal.addEventListener('abort', abortFromCaller, { once: true });

  return controller.signal;
}

/**
 * Wrap fetch so every attempted request consumes a resource from an ExecutionRun.
 * The resource is reserved before the request starts and committed after the fetch
 * settles, including network failures, because the external attempt has already
 * been made by that point.
 */
export function boundedFetch(
  run: ExecutionRun,
  options: BoundedFetchOptions = {},
): typeof globalThis.fetch {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const resource = options.resource ?? 'http.requests';
  const amount = options.amount ?? 1;

  if (!fetchImpl) {
    throw new Error('No fetch implementation is available');
  }

  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const reservation = run.reserve(resource, amount);
    const signal = combineSignals(run.signal, init?.signal);

    try {
      return await fetchImpl(input, { ...init, signal });
    } finally {
      run.commit(reservation);
    }
  };
}

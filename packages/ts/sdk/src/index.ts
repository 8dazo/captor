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

import { BudgetExceededError, PolicyViolationError } from './internal/errors.js';
import { EventBus } from './internal/event-bus.js';
import { HttpBatchExporter, NoopExporter } from './internal/exporter.js';
import { createOpenAIWrapper } from './internal/openai-wrapper.js';
import { PricingRegistry } from './internal/pricing-registry.js';
import { RuntimeSession } from './internal/session.js';
import { createTrackedTool } from './internal/tools.js';

export * from '@captar/types';
export { BudgetExceededError, PolicyViolationError };
export { eventToSpanRecord } from './internal/telemetry.js';

export type OpenAICompatibleWrapOptions = OpenAIWrapOptions & {
  provider?: string;
};

export interface CaptarInstance {
  onEvent(listener: (event: CaptarEvent) => void | Promise<void>): () => void;
  startSession(sessionOptions?: StartSessionOptions): Promise<CaptarSession>;
  wrapOpenAI<TClient extends Record<string, unknown>>(
    client: TClient,
    wrapOptions: OpenAICompatibleWrapOptions
  ): TClient;
  trackTool<TArgs, TResult>(
    name: string,
    toolOptions: TrackToolOptions<TArgs, TResult>
  ): ToolHandle<TResult>;
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
  if (!base && !override) return undefined;
  return {
    budget: { ...base?.budget, ...override?.budget },
    call: { ...base?.call, ...override?.call },
    tool: { ...base?.tool, ...override?.tool },
  };
}

async function fetchControlPlanePolicy(options: CaptarOptions): Promise<SessionPolicy | undefined> {
  const controlPlane = options.controlPlane;
  if (!controlPlane?.syncPolicy) return undefined;

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
      wrapOptions: OpenAICompatibleWrapOptions
    ): TClient {
      const session = wrapOptions.session as RuntimeSession;
      const policy = mergePolicy(session.policy, wrapOptions.policy);
      const provider = wrapOptions.provider?.trim() || 'openai';

      return createOpenAIWrapper(client, {
        session,
        policy,
        provider,
        pricingRegistry,
        onBudgetExceeded: options.onBudgetExceeded,
        onPolicyViolation: options.onPolicyViolation,
      });
    },

    trackTool<TArgs, TResult>(name: string, toolOptions: TrackToolOptions<TArgs, TResult>) {
      const session = toolOptions.session as RuntimeSession;
      return createTrackedTool(name, toolOptions, session.policyEngine);
    },

    async flush(): Promise<void> {
      if ('flush' in exporter && exporter.flush) {
        await exporter.flush();
      }
    },
  };
}

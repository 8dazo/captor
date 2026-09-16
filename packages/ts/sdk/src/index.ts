import { defaultSessionPolicy, getCaptarEnvConfig } from '@captar/config';
import type {
  CaptarEvent,
  CaptarOptions,
  CaptarSession,
  Exporter,
  OpenAIWrapOptions,
  PayloadRetentionMode,
  SessionPolicy,
  StartSessionOptions,
  ToolHandle,
  TrackToolOptions,
} from '@captar/types';

import { BudgetExceededError, PolicyViolationError } from './internal/errors.js';
import { EventBus } from './internal/event-bus.js';
import { HttpBatchExporter, NoopExporter } from './internal/exporter.js';
import { governOpenAIHelpers } from './internal/openai-helpers.js';
import { createOpenAIWrapper } from './internal/openai-wrapper.js';
import { normalizePayloadRetention } from './internal/payload-retention.js';
import {
  overlayPolicy,
  restrictPolicy,
  validateSessionPolicy,
} from './internal/policy-compiler.js';
import { PricingRegistry } from './internal/pricing-registry.js';
import { governProviderCharges } from './internal/provider-charges.js';
import {
  governSessionLifecycle,
  governToolLifecycle,
} from './internal/session-lifecycle.js';
import { RuntimeSession } from './internal/session.js';
import { createTrackedTool } from './internal/tools.js';

export * from '@captar/types';
export { BudgetExceededError, PolicyViolationError };
export { eventToSpanRecord } from './internal/telemetry.js';

export type OpenAICompatibleWrapOptions = OpenAIWrapOptions & {
  provider?: string;
  useFinalizationReserve?: boolean;
  providerToolCostsUsd?: Readonly<Record<string, number>>;
};

interface SyncedControlPlaneConfig {
  policy?: SessionPolicy;
  payloadRetention: PayloadRetentionMode;
  policyVersion?: number | null;
}

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function fetchControlPlaneConfig(
  options: CaptarOptions,
): Promise<SyncedControlPlaneConfig | undefined> {
  const controlPlane = options.controlPlane;
  if (!controlPlane?.syncPolicy) return undefined;

  const baseUrl = controlPlane.baseUrl ?? 'http://localhost:3000';
  const response = await fetch(
    `${baseUrl.replace(/\/$/, '')}/api/hooks/${controlPlane.hookId}/policy`,
    {
      headers: {
        ...(controlPlane.apiKey ? { authorization: `Bearer ${controlPlane.apiKey}` } : {}),
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to load control-plane policy for ${controlPlane.hookId}.`);
  }

  const payload: unknown = await response.json();
  if (!isRecord(payload) || !isRecord(payload.hook)) {
    throw new RangeError('Control-plane policy response must contain a hook object.');
  }

  const rawPolicyVersion = payload.hook.policyVersion;
  let policyVersion: number | null | undefined;
  if (rawPolicyVersion === null || rawPolicyVersion === undefined) {
    policyVersion = rawPolicyVersion;
  } else if (
    typeof rawPolicyVersion === 'number' &&
    Number.isInteger(rawPolicyVersion) &&
    rawPolicyVersion >= 0
  ) {
    policyVersion = rawPolicyVersion;
  } else {
    throw new RangeError('Control-plane policyVersion must be a non-negative integer or null.');
  }

  return {
    policy: validateSessionPolicy(payload.hook.policy, 'control-plane policy'),
    payloadRetention: normalizePayloadRetention(payload.hook.payloadRetention),
    policyVersion,
  };
}

export function createCaptar(options: CaptarOptions): CaptarInstance {
  const bus = new EventBus();
  const exporter = createExporter(options);
  const pricingRegistry = new PricingRegistry(
    options.pricing ?? 'builtin',
    options.pricingOverrides,
  );
  const configuredDefaultPolicy = overlayPolicy(
    defaultSessionPolicy,
    validateSessionPolicy(options.defaultPolicy, 'defaultPolicy'),
  );

  return {
    onEvent(listener: (event: Parameters<typeof bus.emit>[0]) => void | Promise<void>) {
      return bus.subscribe(listener);
    },

    async startSession(sessionOptions: StartSessionOptions = {}): Promise<CaptarSession> {
      const synced = await fetchControlPlaneConfig(options);
      const localSessionPolicy = overlayPolicy(
        configuredDefaultPolicy,
        validateSessionPolicy(sessionOptions.policy, 'session policy'),
      );
      const localPolicyWithBudget = overlayPolicy(
        localSessionPolicy,
        sessionOptions.budget
          ? {
              budget: sessionOptions.budget,
            }
          : undefined,
      );
      const policy = synced?.policy
        ? restrictPolicy(localPolicyWithBudget, synced.policy)
        : localPolicyWithBudget;
      const metadata = {
        ...sessionOptions.metadata,
        ...(options.controlPlane ? { _captarHookId: options.controlPlane.hookId } : {}),
        ...(synced ? { _captarPayloadRetention: synced.payloadRetention } : {}),
        ...(typeof synced?.policyVersion === 'number'
          ? { _captarPolicyVersion: synced.policyVersion }
          : {}),
      };
      const session = new RuntimeSession(
        options.project,
        policy?.budget ?? {},
        metadata,
        policy,
        bus,
        exporter as HttpBatchExporter | NoopExporter,
        {
          onBudgetExceeded: options.onBudgetExceeded,
          onPolicyViolation: options.onPolicyViolation,
        },
        synced?.payloadRetention ?? 'raw',
      );
      await session.initialize();
      return session;
    },

    wrapOpenAI<TClient extends Record<string, any>>(
      client: TClient,
      wrapOptions: OpenAICompatibleWrapOptions,
    ): TClient {
      const baseSession = wrapOptions.session as RuntimeSession;
      const session = wrapOptions.useFinalizationReserve
        ? baseSession.asFinalizationSession()
        : baseSession;
      const policy = restrictPolicy(
        baseSession.policy,
        validateSessionPolicy(wrapOptions.policy, 'wrapper policy'),
      );
      const provider = wrapOptions.provider?.trim() || 'openai';

      const wrappedClient = createOpenAIWrapper(client, {
        session,
        policy,
        provider,
        pricingRegistry,
        onBudgetExceeded: ({ attemptedUsd }) => {
          baseSession.notifyBudgetExceeded(attemptedUsd);
        },
        onPolicyViolation: ({ reason, type }) => {
          baseSession.notifyPolicyViolation(reason, type);
        },
      });
      const chargeAwareClient = governProviderCharges(
        wrappedClient,
        wrapOptions.providerToolCostsUsd,
      );
      const lifecycleAwareClient = governSessionLifecycle(chargeAwareClient, session);
      return governOpenAIHelpers(lifecycleAwareClient);
    },

    trackTool<TArgs, TResult>(name: string, toolOptions: TrackToolOptions<TArgs, TResult>) {
      const session = toolOptions.session as RuntimeSession;
      const handle = createTrackedTool(name, toolOptions, session.policyEngine);
      return governToolLifecycle(handle, session);
    },

    async flush(): Promise<void> {
      if ('flush' in exporter && exporter.flush) {
        await exporter.flush();
      }
    },
  };
}

import { defaultSessionPolicy, getCaptarEnvConfig } from '@captar/config';
import type {
  CaptarEvent,
  CaptarOptions,
  CaptarSession,
  Exporter,
  OpenAIWrapOptions,
  SessionPolicy,
  StartSessionOptions,
  ToolHandle,
  TrackToolOptions,
} from '@captar/types';

import {
  ControlPlanePolicyLoader,
  type ControlPlanePolicySource,
  type ControlPlaneSyncMode,
  type RuntimeControlPlaneOptions,
} from './internal/control-plane.js';
import { BudgetExceededError, PolicyViolationError } from './internal/errors.js';
import { EventBus } from './internal/event-bus.js';
import { HttpBatchExporter, NoopExporter } from './internal/exporter.js';
import { governOpenAIHelpers } from './internal/openai-helpers.js';
import { createOpenAIWrapper } from './internal/openai-wrapper.js';
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
export type {
  ControlPlanePolicySource,
  ControlPlaneSyncMode,
  RuntimeControlPlaneOptions,
};

export type OpenAICompatibleWrapOptions = OpenAIWrapOptions & {
  provider?: string;
  useFinalizationReserve?: boolean;
  providerToolCostsUsd?: Readonly<Record<string, number>>;
};

export interface CaptarRuntimeOptions extends Omit<CaptarOptions, 'controlPlane'> {
  controlPlane?: RuntimeControlPlaneOptions;
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

interface ResolvedEnvConfig {
  ingestUrl?: string;
  ingestApiKey?: string;
  defaultTimeoutMs?: number;
}

function createExporter(
  options: CaptarRuntimeOptions,
  envConfig: ResolvedEnvConfig,
): Exporter | HttpBatchExporter {
  const exporterProject = options.project;
  const exporterHookId = options.controlPlane?.hookId;
  if (!options.exporter) {
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

function syncEnabled(controlPlane: RuntimeControlPlaneOptions | undefined): boolean {
  return Boolean(
    controlPlane &&
      (controlPlane.syncPolicy === true || controlPlane.syncMode !== undefined),
  );
}

export function createCaptar(options: CaptarRuntimeOptions): CaptarInstance {
  const envConfig = getCaptarEnvConfig();
  const bus = new EventBus();
  const exporter = createExporter(options, envConfig);
  const pricingRegistry = new PricingRegistry(
    options.pricing ?? 'builtin',
    options.pricingOverrides,
  );
  const envDefaultPolicy: SessionPolicy | undefined = envConfig.defaultTimeoutMs
    ? { call: { timeoutMs: envConfig.defaultTimeoutMs } }
    : undefined;
  const configuredDefaultPolicy = overlayPolicy(
    overlayPolicy(defaultSessionPolicy, envDefaultPolicy),
    validateSessionPolicy(options.defaultPolicy, 'defaultPolicy'),
  );
  const controlPlaneLoader = new ControlPlanePolicyLoader(options.controlPlane);

  return {
    onEvent(listener: (event: Parameters<typeof bus.emit>[0]) => void | Promise<void>) {
      return bus.subscribe(listener);
    },

    async startSession(sessionOptions: StartSessionOptions = {}): Promise<CaptarSession> {
      const syncResult = await controlPlaneLoader.load();
      const synced = syncResult.config;
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
        ...(syncEnabled(options.controlPlane)
          ? { _captarPolicySource: syncResult.source }
          : {}),
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

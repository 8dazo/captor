import type { PayloadRetentionMode, SessionPolicy } from '@captar/types';

import { normalizePayloadRetention } from './payload-retention.js';
import { validateSessionPolicy } from './policy-compiler.js';

export type ControlPlaneSyncMode = 'required' | 'cached' | 'best-effort';
export type ControlPlanePolicySource = 'remote' | 'cache' | 'local';

export interface RuntimeControlPlaneOptions {
  hookId: string;
  baseUrl?: string;
  syncPolicy?: boolean;
  apiKey?: string;
  /** Explicit availability contract for policy sync. Setting this enables sync. */
  syncMode?: ControlPlaneSyncMode;
  /** Independent timeout for the control-plane policy request. Defaults to 5s. */
  syncTimeoutMs?: number;
  /** In-process last-known-policy TTL for cached/best-effort modes. Defaults to 60s. */
  cacheTtlMs?: number;
}

export interface SyncedControlPlaneConfig {
  policy?: SessionPolicy;
  payloadRetention: PayloadRetentionMode;
  policyVersion?: number | null;
}

export interface ControlPlaneLoadResult {
  config?: SyncedControlPlaneConfig;
  source: ControlPlanePolicySource;
}

interface CachedControlPlaneConfig {
  config: SyncedControlPlaneConfig;
  fetchedAtMs: number;
}

const DEFAULT_SYNC_TIMEOUT_MS = 5_000;
const DEFAULT_CACHE_TTL_MS = 60_000;

function positiveInteger(value: number | undefined, fallback: number, label: string): number {
  if (value === undefined) return fallback;
  if (!Number.isFinite(value) || !Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a finite positive integer.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseResponse(payload: unknown): SyncedControlPlaneConfig {
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

export class ControlPlanePolicyLoader {
  private readonly enabled: boolean;
  private readonly mode: ControlPlaneSyncMode;
  private readonly timeoutMs: number;
  private readonly cacheTtlMs: number;
  private cache?: CachedControlPlaneConfig;

  constructor(private readonly options: RuntimeControlPlaneOptions | undefined) {
    if (!options) {
      this.enabled = false;
      this.mode = 'required';
      this.timeoutMs = DEFAULT_SYNC_TIMEOUT_MS;
      this.cacheTtlMs = DEFAULT_CACHE_TTL_MS;
      return;
    }

    if (options.syncPolicy === false && options.syncMode !== undefined) {
      throw new RangeError('controlPlane.syncPolicy=false cannot be combined with syncMode.');
    }

    this.enabled = options.syncPolicy === true || options.syncMode !== undefined;
    this.mode = options.syncMode ?? 'required';
    this.timeoutMs = positiveInteger(
      options.syncTimeoutMs,
      DEFAULT_SYNC_TIMEOUT_MS,
      'controlPlane.syncTimeoutMs',
    );
    this.cacheTtlMs = positiveInteger(
      options.cacheTtlMs,
      DEFAULT_CACHE_TTL_MS,
      'controlPlane.cacheTtlMs',
    );
  }

  async load(nowMs = Date.now()): Promise<ControlPlaneLoadResult> {
    if (!this.enabled || !this.options) {
      return { source: 'local' };
    }

    if (this.mode !== 'required' && this.isFresh(nowMs)) {
      return {
        config: this.cache!.config,
        source: 'cache',
      };
    }

    try {
      const config = await this.fetchRemote();
      this.cache = { config, fetchedAtMs: nowMs };
      return { config, source: 'remote' };
    } catch (error) {
      if (this.mode === 'best-effort') {
        return { source: 'local' };
      }
      throw error;
    }
  }

  private isFresh(nowMs: number): boolean {
    return Boolean(this.cache && nowMs - this.cache.fetchedAtMs <= this.cacheTtlMs);
  }

  private async fetchRemote(): Promise<SyncedControlPlaneConfig> {
    const options = this.options!;
    const baseUrl = options.baseUrl ?? 'http://localhost:3000';
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(
        new Error(`Captar control-plane sync timed out after ${this.timeoutMs}ms.`),
      );
    }, this.timeoutMs);
    timer.unref?.();

    try {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, '')}/api/hooks/${options.hookId}/policy`,
        {
          signal: controller.signal,
          headers: {
            ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}),
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load control-plane policy for ${options.hookId}.`);
      }

      return parseResponse(await response.json());
    } finally {
      clearTimeout(timer);
    }
  }
}

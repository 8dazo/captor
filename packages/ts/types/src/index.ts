export type MetadataValue = string | number | boolean | null;

export interface Metadata {
  [key: string]: MetadataValue | undefined;
}

export interface BudgetPolicy {
  maxSpendUsd?: number;
  softLimitPct?: number;
  finalizationReserveUsd?: number;
  maxRepeatedCalls?: number;
}

export interface CallPolicy {
  allowedModels?: string[];
  blockedModels?: string[];
  maxEstimatedCostUsd?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  retriesCeiling?: number;
}

export interface ToolPolicy {
  allowedTools?: string[];
  blockedTools?: string[];
  maxCallsPerSession?: number;
  requireApprovalFor?: string[];
}

export interface SessionPolicy {
  budget?: BudgetPolicy;
  call?: CallPolicy;
  tool?: ToolPolicy;
}

export interface PricingEntry {
  model: string;
  provider: string;
  inputCostPer1kTokensUsd: number;
  outputCostPer1kTokensUsd: number;
  cachedInputCostPer1kTokensUsd?: number;
  effectiveFrom?: string;
}

export interface PricingOverride {
  provider: string;
  model: string;
  inputCostPer1kTokensUsd?: number;
  outputCostPer1kTokensUsd?: number;
  cachedInputCostPer1kTokensUsd?: number;
}

export interface UsageRecord {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  estimatedCostUsd?: number;
  costUsd: number;
}

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
}

export type GuardrailCategory =
  | "spend"
  | "execution"
  | "safety"
  | "access"
  | "workflow";

export type CaptarEventType =
  | "session.started"
  | "session.closed"
  | "request.started"
  | "request.allowed"
  | "request.blocked"
  | "estimate.reserved"
  | "provider.response"
  | "spend.committed"
  | "tool.started"
  | "tool.completed"
  | "guardrail.violation";

export interface CaptarEvent<TData = Record<string, unknown>> {
  id: string;
  type: CaptarEventType;
  timestamp: string;
  sessionId: string;
  trace: TraceContext;
  project?: string;
  metadata?: Metadata;
  data: TData;
}

export interface ExportBatch {
  project?: string;
  events: CaptarEvent[];
}

export interface ExportResult {
  accepted: number;
  retryable?: boolean;
}

export interface Exporter {
  export(batch: ExportBatch): Promise<ExportResult>;
  flush?(): Promise<void>;
}

export interface EstimateResult {
  provider: string;
  model: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostUsd: number;
}

export interface ProviderAdapter<TRequest = unknown, TResponse = unknown> {
  readonly provider: string;
  estimate(request: TRequest): Promise<EstimateResult>;
  execute(request: TRequest): Promise<TResponse>;
  extractUsage(response: TResponse, estimatedCostUsd?: number): UsageRecord;
}

export interface SessionSummary {
  sessionId: string;
  startedAt: string;
  closedAt?: string;
  totalReservedUsd: number;
  totalCommittedUsd: number;
  totalReleasedUsd: number;
  requestCount: number;
  blockedCount: number;
  toolCallCount: number;
  metadata?: Metadata;
}

export interface SessionState {
  committedUsd: number;
  reservedUsd: number;
  remainingUsd: number;
}

export interface StartSessionOptions {
  budget?: BudgetPolicy;
  metadata?: Metadata;
  policy?: SessionPolicy;
}

export interface ReserveFundsOptions {
  isFinal?: boolean;
  label?: string;
}

export interface ToolEstimateContext<TArgs = unknown> {
  sessionId: string;
  name: string;
  args: TArgs;
}

export interface ToolActualContext<TResult = unknown> {
  sessionId: string;
  name: string;
  result: TResult;
}

export interface ToolApprovalContext<TArgs = unknown> {
  sessionId: string;
  name: string;
  args: TArgs;
}

export interface ToolHandle<TResult> {
  run(work: () => Promise<TResult>): Promise<TResult>;
}

export interface TrackToolOptions<TArgs = unknown, TResult = unknown> {
  session: CaptarSession;
  args?: TArgs;
  estimate?:
    | number
    | ((context: ToolEstimateContext<TArgs>) => Promise<number> | number);
  actual?:
    | number
    | ((context: ToolActualContext<TResult>) => Promise<number> | number);
  policy?: ToolPolicy;
  approval?:
    | ((context: ToolApprovalContext<TArgs>) => Promise<boolean> | boolean)
    | boolean;
}

export interface OpenAIWrapOptions {
  session: CaptarSession;
  policy?: SessionPolicy;
}

export interface CaptarSession {
  readonly id: string;
  readonly trace: TraceContext;
  readonly metadata?: Metadata;
  readonly budget: BudgetPolicy;
  readonly policy?: SessionPolicy;
  getState(): SessionState;
  getSummary(): SessionSummary;
  close(): Promise<SessionSummary>;
}

export interface HttpExporterOptions {
  url: string;
  apiKey?: string;
  batchSize?: number;
  headers?: Record<string, string>;
}

export interface CaptarOptions {
  project: string;
  pricing?: "builtin" | PricingEntry[];
  pricingOverrides?: PricingOverride[];
  exporter?: HttpExporterOptions | Exporter;
  defaultPolicy?: SessionPolicy;
}

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

export type PayloadRetentionMode = 'redacted' | 'raw' | 'none';

export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

export interface JsonObject {
  [key: string]: JsonValue | undefined;
}

export type DatasetFileFormat = 'json' | 'jsonl' | 'csv';

export type DatasetSourceKind = 'trace_export' | 'file_import';

export interface DatasetRowSource {
  kind: DatasetSourceKind;
  traceId?: string;
  externalTraceId?: string;
  spanId?: string;
  inputRetentionMode?: PayloadRetentionMode;
  outputRetentionMode?: PayloadRetentionMode;
  importedFormat?: DatasetFileFormat;
}

export interface DatasetRowRecord {
  input: JsonValue;
  output?: JsonValue;
  metadata?: JsonObject;
  source?: DatasetRowSource;
}

export interface DatasetSnapshot {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  rowCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DatasetRowSnapshot extends DatasetRowRecord {
  id: string;
  datasetId: string;
  position: number;
  createdAt: string;
}

export interface TraceDatasetExportInput {
  traceId: string;
  externalTraceId: string;
  spanId?: string;
  prompt?: string | null;
  response?: string | null;
  promptRetentionMode?: PayloadRetentionMode;
  responseRetentionMode?: PayloadRetentionMode;
  metadata?: JsonObject;
}

export type ManualEvalVerdict = 'pass' | 'fail';

export type ManualEvalRunStatus = 'in_progress' | 'completed';

export interface ManualEvalCriterion {
  id: string;
  position: number;
  label: string;
  description?: string;
  weight: number;
}

export interface ManualEvalCriterionAverage {
  criterionId: string;
  label: string;
  weight: number;
  reviewedRows: number;
  averageScore?: number;
}

export interface ManualEvalMetrics {
  totalRows: number;
  reviewedRows: number;
  pendingRows: number;
  passCount: number;
  failCount: number;
  passRate: number;
  failRate: number;
  overallAverageScore?: number;
  criterionAverages: ManualEvalCriterionAverage[];
}

export interface ManualEval {
  id: string;
  projectId: string;
  datasetId: string;
  name: string;
  description?: string;
  reviewerInstructions?: string;
  runCount: number;
  metrics: ManualEvalMetrics;
  criteria: ManualEvalCriterion[];
  createdAt: string;
  updatedAt: string;
}

export interface ManualEvalRunItemCriterionScore {
  criterionId: string;
  score: number;
}

export interface ManualEvalRunItem {
  id: string;
  runId: string;
  datasetRowId: string;
  position: number;
  row: DatasetRowSnapshot;
  verdict?: ManualEvalVerdict;
  notes?: string;
  overallScore?: number;
  criterionScores: ManualEvalRunItemCriterionScore[];
  reviewerUserId?: string;
  reviewedAt?: string;
}

export interface ManualEvalRun {
  id: string;
  manualEvalId: string;
  datasetId: string;
  status: ManualEvalRunStatus;
  createdByUserId: string;
  metrics: ManualEvalMetrics;
  items: ManualEvalRunItem[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ControlPlaneProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Metadata;
}

export interface ControlPlaneHook {
  id: string;
  payloadRetention: PayloadRetentionMode;
  policy: SessionPolicy;
  policyVersion?: number | null;
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

export type TraceSpanKind = 'session' | 'request' | 'tool';

export type TraceSpanStatus = 'running' | 'completed' | 'blocked' | 'failed';

export interface TraceSpanSnapshot {
  id: string;
  parentId?: string;
  name: string;
  kind: TraceSpanKind;
  status: TraceSpanStatus;
  startedAt: string;
  endedAt?: string;
  attributes?: Metadata;
}

export type GuardrailCategory = 'spend' | 'execution' | 'safety' | 'access' | 'workflow';

export type CaptarEventType =
  | 'session.started'
  | 'session.closed'
  | 'request.started'
  | 'request.allowed'
  | 'request.blocked'
  | 'request.failed'
  | 'estimate.reserved'
  | 'provider.response'
  | 'spend.committed'
  | 'tool.started'
  | 'tool.blocked'
  | 'tool.completed'
  | 'tool.failed'
  | 'guardrail.violation';

export interface CaptarEvent<TData = Record<string, unknown>> {
  id: string;
  type: CaptarEventType;
  timestamp: string;
  sessionId: string;
  trace: TraceContext;
  span?: TraceSpanSnapshot;
  project?: string;
  metadata?: Metadata;
  data: TData;
}

export interface ExportBatch {
  project?: string;
  hookId?: string;
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
  estimate?: number | ((context: ToolEstimateContext<TArgs>) => Promise<number> | number);
  actual?: number | ((context: ToolActualContext<TResult>) => Promise<number> | number);
  policy?: ToolPolicy;
  approval?: ((context: ToolApprovalContext<TArgs>) => Promise<boolean> | boolean) | boolean;
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

export interface ControlPlaneOptions {
  hookId: string;
  baseUrl?: string;
  syncPolicy?: boolean;
  apiKey?: string;
}

export interface CaptarOptions {
  project: string;
  pricing?: 'builtin' | PricingEntry[];
  pricingOverrides?: PricingOverride[];
  exporter?: HttpExporterOptions | Exporter;
  defaultPolicy?: SessionPolicy;
  controlPlane?: ControlPlaneOptions;
  onBudgetExceeded?: (context: {
    sessionId: string;
    budgetUsd: number;
    attemptedUsd: number;
  }) => void;
  onPolicyViolation?: (context: { sessionId: string; reason: string; type: string }) => void;
}

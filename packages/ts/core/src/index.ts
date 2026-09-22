export type RunStatus = 'running' | 'succeeded' | 'failed' | 'aborted';

export interface OutcomeRule {
  min?: number;
  max?: number;
  equals?: number;
}

export interface ExecutionContract {
  limits?: {
    durationMs?: number;
    resources?: Readonly<Record<string, number>>;
  };
  outcome?: Readonly<Record<string, OutcomeRule>>;
}

export type ViolationKind = 'resource-limit' | 'deadline' | 'outcome' | 'invalid-operation';

export interface ExecutionViolation {
  kind: ViolationKind;
  message: string;
  resource?: string;
  metric?: string;
  limit?: number;
  actual?: number;
}

export interface ResourceUsage {
  limit?: number;
  committed: number;
  reserved: number;
}

export interface ExecutionReceipt {
  id: string;
  name: string;
  status: RunStatus;
  startedAt: string;
  endedAt?: string;
  resources: Record<string, ResourceUsage>;
  metrics: Record<string, number>;
  checkpoints: Record<string, unknown>;
  violations: ExecutionViolation[];
}

export interface Reservation {
  readonly id: string;
  readonly resource: string;
  readonly amount: number;
}

export interface ExecutionResult<T> {
  value: T;
  receipt: ExecutionReceipt;
}

interface StoredReservation extends Reservation {
  state: 'active' | 'committed' | 'released';
}

function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function assertFiniteNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number`);
  }
}

function assertFinitePositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${label} must be a finite positive number`);
  }
}

export class ContractViolationError extends Error {
  readonly receipt: ExecutionReceipt;

  constructor(message: string, receipt: ExecutionReceipt) {
    super(message);
    this.name = 'ContractViolationError';
    this.receipt = receipt;
  }
}

export class ExecutionRun {
  readonly id: string;
  readonly name: string;
  readonly signal: AbortSignal;

  private readonly contract: ExecutionContract;
  private readonly controller = new AbortController();
  private readonly startedAt = new Date();
  private endedAt?: Date;
  private status: RunStatus = 'running';
  private readonly committed = new Map<string, number>();
  private readonly reserved = new Map<string, number>();
  private readonly reservations = new Map<string, StoredReservation>();
  private readonly metrics = new Map<string, number>();
  private readonly checkpoints = new Map<string, unknown>();
  private readonly violations: ExecutionViolation[] = [];

  constructor(name: string, contract: ExecutionContract = {}) {
    if (!name.trim()) {
      throw new Error('execution name must not be empty');
    }

    const durationMs = contract.limits?.durationMs;
    if (durationMs !== undefined) {
      assertFinitePositive(durationMs, 'durationMs');
    }

    for (const [resource, limit] of Object.entries(contract.limits?.resources ?? {})) {
      if (!resource.trim()) {
        throw new Error('resource names must not be empty');
      }
      assertFiniteNonNegative(limit, `resource limit for ${resource}`);
    }

    this.id = createId('run');
    this.name = name;
    this.contract = contract;
    this.signal = this.controller.signal;
  }

  consume(resource: string, amount = 1): void {
    this.assertRunning();
    assertFinitePositive(amount, 'amount');
    this.ensureWithinLimit(resource, amount);
    this.committed.set(resource, this.committedAmount(resource) + amount);
  }

  count(resource: string, amount = 1): void {
    this.consume(resource, amount);
  }

  reserve(resource: string, amount: number): Reservation {
    this.assertRunning();
    assertFinitePositive(amount, 'amount');
    this.ensureWithinLimit(resource, amount);

    const reservation: StoredReservation = {
      id: createId('res'),
      resource,
      amount,
      state: 'active',
    };

    this.reservations.set(reservation.id, reservation);
    this.reserved.set(resource, this.reservedAmount(resource) + amount);

    return {
      id: reservation.id,
      resource: reservation.resource,
      amount: reservation.amount,
    };
  }

  commit(reservation: Reservation, actualAmount = reservation.amount): void {
    this.assertRunning();
    assertFiniteNonNegative(actualAmount, 'actualAmount');

    const stored = this.requireActiveReservation(reservation);
    const resource = stored.resource;

    this.reserved.set(resource, Math.max(0, this.reservedAmount(resource) - stored.amount));
    stored.state = 'committed';

    const nextCommitted = this.committedAmount(resource) + actualAmount;
    this.committed.set(resource, nextCommitted);

    const limit = this.resourceLimit(resource);
    const totalHeld = nextCommitted + this.reservedAmount(resource);
    if (limit !== undefined && totalHeld > limit) {
      this.raiseViolation({
        kind: 'resource-limit',
        resource,
        limit,
        actual: totalHeld,
        message: `${resource} exceeded its limit of ${limit}; actual committed/reserved usage is ${totalHeld}`,
      });
    }
  }

  release(reservation: Reservation): void {
    this.assertRunning();
    const stored = this.requireActiveReservation(reservation);
    this.reserved.set(
      stored.resource,
      Math.max(0, this.reservedAmount(stored.resource) - stored.amount)
    );
    stored.state = 'released';
  }

  remaining(resource: string): number | undefined {
    const limit = this.resourceLimit(resource);
    if (limit === undefined) {
      return undefined;
    }
    return Math.max(0, limit - this.totalHeld(resource));
  }

  metric(name: string, value: number): void {
    this.assertRunning();
    if (!name.trim()) {
      throw new Error('metric name must not be empty');
    }
    if (!Number.isFinite(value)) {
      throw new RangeError('metric value must be finite');
    }
    this.metrics.set(name, value);
  }

  checkpoint(name: string, value: unknown): void {
    this.assertRunning();
    if (!name.trim()) {
      throw new Error('checkpoint name must not be empty');
    }
    this.checkpoints.set(name, value);
  }

  abort(reason = 'execution deadline exceeded'): void {
    if (this.status !== 'running') {
      return;
    }

    const durationMs = this.contract.limits?.durationMs;
    const violation: ExecutionViolation = {
      kind: 'deadline',
      message: reason,
    };
    if (durationMs !== undefined) {
      violation.limit = durationMs;
    }

    this.violations.push(violation);
    this.status = 'aborted';
    this.endedAt = new Date();
    this.controller.abort(reason);
  }

  complete(): ExecutionReceipt {
    this.assertRunning();
    this.evaluateOutcome();

    if (this.violations.length > 0) {
      this.status = 'failed';
      this.endedAt = new Date();
      const receipt = this.receipt();
      throw new ContractViolationError(
        receipt.violations[0]?.message ?? 'execution contract failed',
        receipt
      );
    }

    this.status = 'succeeded';
    this.endedAt = new Date();
    return this.receipt();
  }

  fail(): void {
    if (this.status !== 'running') {
      return;
    }
    this.status = 'failed';
    this.endedAt = new Date();
  }

  receipt(): ExecutionReceipt {
    const resources = new Set<string>([
      ...Object.keys(this.contract.limits?.resources ?? {}),
      ...this.committed.keys(),
      ...this.reserved.keys(),
    ]);

    const resourceUsage: Record<string, ResourceUsage> = {};
    for (const resource of resources) {
      const usage: ResourceUsage = {
        committed: this.committedAmount(resource),
        reserved: this.reservedAmount(resource),
      };
      const limit = this.resourceLimit(resource);
      if (limit !== undefined) {
        usage.limit = limit;
      }
      resourceUsage[resource] = usage;
    }

    return {
      id: this.id,
      name: this.name,
      status: this.status,
      startedAt: this.startedAt.toISOString(),
      ...(this.endedAt ? { endedAt: this.endedAt.toISOString() } : {}),
      resources: resourceUsage,
      metrics: Object.fromEntries(this.metrics),
      checkpoints: Object.fromEntries(this.checkpoints),
      violations: this.violations.map((violation) => ({ ...violation })),
    };
  }

  private assertRunning(): void {
    if (this.status !== 'running') {
      throw new Error(`execution ${this.id} is ${this.status}`);
    }
  }

  private resourceLimit(resource: string): number | undefined {
    return this.contract.limits?.resources?.[resource];
  }

  private committedAmount(resource: string): number {
    return this.committed.get(resource) ?? 0;
  }

  private reservedAmount(resource: string): number {
    return this.reserved.get(resource) ?? 0;
  }

  private totalHeld(resource: string): number {
    return this.committedAmount(resource) + this.reservedAmount(resource);
  }

  private ensureWithinLimit(resource: string, amount: number): void {
    const limit = this.resourceLimit(resource);
    if (limit === undefined) {
      return;
    }

    const attempted = this.totalHeld(resource) + amount;
    if (attempted > limit) {
      this.raiseViolation({
        kind: 'resource-limit',
        resource,
        limit,
        actual: attempted,
        message: `${resource} would exceed its limit of ${limit}; attempted usage is ${attempted}`,
      });
    }
  }

  private requireActiveReservation(reservation: Reservation): StoredReservation {
    const stored = this.reservations.get(reservation.id);
    if (
      !stored ||
      stored.resource !== reservation.resource ||
      stored.amount !== reservation.amount
    ) {
      this.raiseViolation({
        kind: 'invalid-operation',
        resource: reservation.resource,
        message: `unknown reservation ${reservation.id}`,
      });
    }

    if (stored.state !== 'active') {
      this.raiseViolation({
        kind: 'invalid-operation',
        resource: stored.resource,
        message: `reservation ${stored.id} is already ${stored.state}`,
      });
    }

    return stored;
  }

  private evaluateOutcome(): void {
    for (const [metric, rule] of Object.entries(this.contract.outcome ?? {})) {
      const value = this.metrics.get(metric);
      if (value === undefined) {
        this.violations.push({
          kind: 'outcome',
          metric,
          message: `required outcome metric ${metric} was not reported`,
        });
        continue;
      }

      if (rule.min !== undefined && value < rule.min) {
        this.violations.push({
          kind: 'outcome',
          metric,
          limit: rule.min,
          actual: value,
          message: `${metric} must be at least ${rule.min}; actual value is ${value}`,
        });
      }

      if (rule.max !== undefined && value > rule.max) {
        this.violations.push({
          kind: 'outcome',
          metric,
          limit: rule.max,
          actual: value,
          message: `${metric} must be at most ${rule.max}; actual value is ${value}`,
        });
      }

      if (rule.equals !== undefined && value !== rule.equals) {
        this.violations.push({
          kind: 'outcome',
          metric,
          limit: rule.equals,
          actual: value,
          message: `${metric} must equal ${rule.equals}; actual value is ${value}`,
        });
      }
    }
  }

  private raiseViolation(violation: ExecutionViolation): never {
    this.violations.push(violation);
    this.status = 'failed';
    this.endedAt = new Date();
    throw new ContractViolationError(violation.message, this.receipt());
  }
}

export async function run<T>(
  name: string,
  contract: ExecutionContract,
  execute: (run: ExecutionRun) => Promise<T> | T
): Promise<ExecutionResult<T>> {
  const execution = new ExecutionRun(name, contract);
  const durationMs = contract.limits?.durationMs;
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const work = Promise.resolve(execute(execution));
    let value: T;

    if (durationMs === undefined) {
      value = await work;
    } else {
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          execution.abort(`execution exceeded its ${durationMs}ms deadline`);
          reject(new ContractViolationError('execution deadline exceeded', execution.receipt()));
        }, durationMs);
      });
      value = await Promise.race([work, deadline]);
    }

    return {
      value,
      receipt: execution.complete(),
    };
  } catch (error) {
    // Also finalize an outer run when a nested run throws a contract violation.
    // fail() preserves this run's existing failed/aborted terminal state.
    execution.fail();
    throw error;
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

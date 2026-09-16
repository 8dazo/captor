import type { BudgetPolicy, SessionState } from "@captar/types";
import { roundUsd, sumUsd } from "@captar/utils";

import { BudgetExceededError } from "./errors.js";

export interface BudgetReconciliation {
  releasedUsd: number;
  actualUsd: number;
  reservationOverrunUsd: number;
  hardBudgetOverrunUsd: number;
}

export class BudgetEngine {
  private committedUsd = 0;
  private reservedUsd = 0;
  private totalReservedUsd = 0;
  private totalReleasedUsd = 0;

  constructor(private readonly budget: BudgetPolicy) {}

  getState(): SessionState {
    const maxSpendUsd = this.budget.maxSpendUsd ?? Number.POSITIVE_INFINITY;
    return {
      committedUsd: roundUsd(this.committedUsd),
      reservedUsd: roundUsd(this.reservedUsd),
      remainingUsd: roundUsd(maxSpendUsd - this.committedUsd - this.reservedUsd),
    };
  }

  getTotals(): {
    totalReservedUsd: number;
    totalReleasedUsd: number;
    totalCommittedUsd: number;
  } {
    return {
      totalReservedUsd: roundUsd(this.totalReservedUsd),
      totalReleasedUsd: roundUsd(this.totalReleasedUsd),
      totalCommittedUsd: roundUsd(this.committedUsd),
    };
  }

  reserve(amountUsd: number, options: { isFinal?: boolean } = {}): number {
    if (!Number.isFinite(amountUsd) || amountUsd < 0) {
      throw new RangeError("Reservation amount must be a finite non-negative USD value.");
    }

    const normalizedAmountUsd = roundUsd(amountUsd);
    const finalizationReserveUsd = this.budget.finalizationReserveUsd ?? 0;
    const maxSpendUsd = this.budget.maxSpendUsd ?? Number.POSITIVE_INFINITY;
    const protectedReserve = options.isFinal ? 0 : finalizationReserveUsd;
    const remaining = maxSpendUsd - this.committedUsd - this.reservedUsd - protectedReserve;

    if (normalizedAmountUsd > remaining) {
      throw new BudgetExceededError(
        `Insufficient remaining budget to reserve $${normalizedAmountUsd.toFixed(4)}.`,
      );
    }

    this.reservedUsd = sumUsd(this.reservedUsd, normalizedAmountUsd);
    this.totalReservedUsd = sumUsd(this.totalReservedUsd, normalizedAmountUsd);
    return normalizedAmountUsd;
  }

  commit(reservedUsd: number, actualUsd: number): BudgetReconciliation {
    if (!Number.isFinite(reservedUsd) || reservedUsd < 0) {
      throw new RangeError("Committed reservation must be a finite non-negative USD value.");
    }
    if (!Number.isFinite(actualUsd) || actualUsd < 0) {
      throw new RangeError("Actual provider spend must be a finite non-negative USD value.");
    }

    const normalizedReservedUsd = roundUsd(reservedUsd);
    const normalizedActualUsd = roundUsd(actualUsd);
    if (normalizedReservedUsd > this.reservedUsd + 0.000001) {
      throw new RangeError(
        `Cannot commit reservation $${normalizedReservedUsd.toFixed(6)} because only $${this.reservedUsd.toFixed(6)} is currently reserved.`,
      );
    }

    this.reservedUsd = Math.max(0, roundUsd(this.reservedUsd - normalizedReservedUsd));
    const projectedCommittedUsd = sumUsd(this.committedUsd, normalizedActualUsd);
    const maxSpendUsd = this.budget.maxSpendUsd ?? Number.POSITIVE_INFINITY;
    const reservationOverrunUsd = Math.max(
      0,
      roundUsd(normalizedActualUsd - normalizedReservedUsd),
    );
    const hardBudgetOverrunUsd = Number.isFinite(maxSpendUsd)
      ? Math.max(0, roundUsd(projectedCommittedUsd - maxSpendUsd))
      : 0;

    this.committedUsd = projectedCommittedUsd;
    const releasedUsd = Math.max(
      0,
      roundUsd(normalizedReservedUsd - normalizedActualUsd),
    );
    this.totalReleasedUsd = sumUsd(this.totalReleasedUsd, releasedUsd);

    return {
      releasedUsd,
      actualUsd: normalizedActualUsd,
      reservationOverrunUsd,
      hardBudgetOverrunUsd,
    };
  }
}

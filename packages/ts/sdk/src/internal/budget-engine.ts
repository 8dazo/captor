import type { BudgetPolicy, SessionState } from "@captar/types";
import { roundUsd, sumUsd } from "@captar/utils";

import { BudgetExceededError } from "./errors.js";

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
    const finalizationReserveUsd = this.budget.finalizationReserveUsd ?? 0;
    const maxSpendUsd = this.budget.maxSpendUsd ?? Number.POSITIVE_INFINITY;
    const protectedReserve = options.isFinal ? 0 : finalizationReserveUsd;
    const remaining = maxSpendUsd - this.committedUsd - this.reservedUsd - protectedReserve;

    if (amountUsd > remaining) {
      throw new BudgetExceededError(
        `Insufficient remaining budget to reserve $${amountUsd.toFixed(4)}.`,
      );
    }

    this.reservedUsd = sumUsd(this.reservedUsd, amountUsd);
    this.totalReservedUsd = sumUsd(this.totalReservedUsd, amountUsd);
    return roundUsd(amountUsd);
  }

  commit(reservedUsd: number, actualUsd: number): { releasedUsd: number; actualUsd: number } {
    this.reservedUsd = roundUsd(this.reservedUsd - reservedUsd);
    this.committedUsd = sumUsd(this.committedUsd, actualUsd);
    const releasedUsd = Math.max(0, roundUsd(reservedUsd - actualUsd));
    this.totalReleasedUsd = sumUsd(this.totalReleasedUsd, releasedUsd);
    return {
      releasedUsd,
      actualUsd: roundUsd(actualUsd),
    };
  }
}

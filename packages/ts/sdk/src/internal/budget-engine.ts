import type { BudgetPolicy, SessionState } from "@captar/types";
import { picoUsdToUsd, usdToPicoUsd } from "@captar/utils";

import { BudgetExceededError } from "./errors.js";

export interface BudgetReconciliation {
  releasedUsd: number;
  actualUsd: number;
  reservationOverrunUsd: number;
  hardBudgetOverrunUsd: number;
}

function finiteBudgetToPico(value: number | undefined): bigint | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return usdToPicoUsd(value);
}

export class BudgetEngine {
  private committedPicoUsd = 0n;
  private reservedPicoUsd = 0n;
  private totalReservedPicoUsd = 0n;
  private totalReleasedPicoUsd = 0n;

  constructor(private readonly budget: BudgetPolicy) {}

  getState(): SessionState {
    const maxSpendPicoUsd = finiteBudgetToPico(this.budget.maxSpendUsd);
    return {
      committedUsd: picoUsdToUsd(this.committedPicoUsd),
      reservedUsd: picoUsdToUsd(this.reservedPicoUsd),
      remainingUsd:
        typeof maxSpendPicoUsd === "bigint"
          ? picoUsdToUsd(maxSpendPicoUsd - this.committedPicoUsd - this.reservedPicoUsd)
          : Number.POSITIVE_INFINITY,
    };
  }

  getTotals(): {
    totalReservedUsd: number;
    totalReleasedUsd: number;
    totalCommittedUsd: number;
  } {
    return {
      totalReservedUsd: picoUsdToUsd(this.totalReservedPicoUsd),
      totalReleasedUsd: picoUsdToUsd(this.totalReleasedPicoUsd),
      totalCommittedUsd: picoUsdToUsd(this.committedPicoUsd),
    };
  }

  reserve(amountUsd: number, options: { isFinal?: boolean } = {}): number {
    if (!Number.isFinite(amountUsd) || amountUsd < 0) {
      throw new RangeError("Reservation amount must be a finite non-negative USD value.");
    }

    const amountPicoUsd = usdToPicoUsd(amountUsd);
    const finalizationReservePicoUsd = usdToPicoUsd(this.budget.finalizationReserveUsd ?? 0);
    const maxSpendPicoUsd = finiteBudgetToPico(this.budget.maxSpendUsd);
    const protectedReservePicoUsd = options.isFinal ? 0n : finalizationReservePicoUsd;

    if (typeof maxSpendPicoUsd === "bigint") {
      const remainingPicoUsd =
        maxSpendPicoUsd -
        this.committedPicoUsd -
        this.reservedPicoUsd -
        protectedReservePicoUsd;

      if (amountPicoUsd > remainingPicoUsd) {
        throw new BudgetExceededError(
          `Insufficient remaining budget to reserve $${picoUsdToUsd(amountPicoUsd).toFixed(8)}.`,
        );
      }
    }

    this.reservedPicoUsd += amountPicoUsd;
    this.totalReservedPicoUsd += amountPicoUsd;
    return picoUsdToUsd(amountPicoUsd);
  }

  commit(reservedUsd: number, actualUsd: number): BudgetReconciliation {
    if (!Number.isFinite(reservedUsd) || reservedUsd < 0) {
      throw new RangeError("Committed reservation must be a finite non-negative USD value.");
    }
    if (!Number.isFinite(actualUsd) || actualUsd < 0) {
      throw new RangeError("Actual provider spend must be a finite non-negative USD value.");
    }

    const reservedPicoUsd = usdToPicoUsd(reservedUsd);
    const actualPicoUsd = usdToPicoUsd(actualUsd);
    if (reservedPicoUsd > this.reservedPicoUsd) {
      throw new RangeError(
        `Cannot commit reservation $${picoUsdToUsd(reservedPicoUsd).toFixed(12)} because only $${picoUsdToUsd(this.reservedPicoUsd).toFixed(12)} is currently reserved.`,
      );
    }

    this.reservedPicoUsd -= reservedPicoUsd;
    const projectedCommittedPicoUsd = this.committedPicoUsd + actualPicoUsd;
    const maxSpendPicoUsd = finiteBudgetToPico(this.budget.maxSpendUsd);
    const reservationOverrunPicoUsd =
      actualPicoUsd > reservedPicoUsd ? actualPicoUsd - reservedPicoUsd : 0n;
    const hardBudgetOverrunPicoUsd =
      typeof maxSpendPicoUsd === "bigint" && projectedCommittedPicoUsd > maxSpendPicoUsd
        ? projectedCommittedPicoUsd - maxSpendPicoUsd
        : 0n;

    this.committedPicoUsd = projectedCommittedPicoUsd;
    const releasedPicoUsd =
      reservedPicoUsd > actualPicoUsd ? reservedPicoUsd - actualPicoUsd : 0n;
    this.totalReleasedPicoUsd += releasedPicoUsd;

    return {
      releasedUsd: picoUsdToUsd(releasedPicoUsd),
      actualUsd: picoUsdToUsd(actualPicoUsd),
      reservationOverrunUsd: picoUsdToUsd(reservationOverrunPicoUsd),
      hardBudgetOverrunUsd: picoUsdToUsd(hardBudgetOverrunPicoUsd),
    };
  }
}

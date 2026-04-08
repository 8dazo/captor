import type {
  JsonValue,
  ManualEvalCriterion,
  ManualEvalCriterionAverage,
  ManualEvalMetrics,
  ManualEvalRunItemCriterionScore,
  ManualEvalVerdict,
} from "@captar/types";

interface ManualEvalMetricItem {
  verdict?: ManualEvalVerdict;
  criterionScores?: ManualEvalRunItemCriterionScore[] | null;
}

function roundMetric(value: number) {
  return Number(value.toFixed(3));
}

function scoreForCriterion(
  scores: ManualEvalRunItemCriterionScore[] | null | undefined,
  criterionId: string,
) {
  return scores?.find((entry) => entry.criterionId === criterionId)?.score;
}

export function buildEmptyManualEvalMetrics(
  criteria: ManualEvalCriterion[],
): ManualEvalMetrics {
  return {
    totalRows: 0,
    reviewedRows: 0,
    pendingRows: 0,
    passCount: 0,
    failCount: 0,
    passRate: 0,
    failRate: 0,
    criterionAverages: criteria.map((criterion) => ({
      criterionId: criterion.id,
      label: criterion.label,
      weight: criterion.weight,
      reviewedRows: 0,
    })),
  };
}

export function calculateManualEvalOverallScore(
  criteria: ManualEvalCriterion[],
  scores: ManualEvalRunItemCriterionScore[],
) {
  if (!criteria.length || !scores.length) {
    return undefined;
  }

  let weightedTotal = 0;
  let totalWeight = 0;

  for (const criterion of criteria) {
    const score = scoreForCriterion(scores, criterion.id);
    if (typeof score !== "number") {
      continue;
    }

    weightedTotal += score * criterion.weight;
    totalWeight += criterion.weight;
  }

  if (!totalWeight) {
    return undefined;
  }

  return roundMetric(weightedTotal / totalWeight);
}

export function calculateManualEvalMetrics(
  criteria: ManualEvalCriterion[],
  items: ManualEvalMetricItem[],
): ManualEvalMetrics {
  const reviewedItems = items.filter((item) => item.verdict);
  const passCount = reviewedItems.filter((item) => item.verdict === "pass").length;
  const failCount = reviewedItems.filter((item) => item.verdict === "fail").length;
  const overallScores = reviewedItems
    .map((item) =>
      calculateManualEvalOverallScore(criteria, item.criterionScores ?? []),
    )
    .filter((value): value is number => typeof value === "number");

  const criterionAverages: ManualEvalCriterionAverage[] = criteria.map((criterion) => {
    const criterionScores = reviewedItems
      .map((item) => scoreForCriterion(item.criterionScores, criterion.id))
      .filter((value): value is number => typeof value === "number");

    return {
      criterionId: criterion.id,
      label: criterion.label,
      weight: criterion.weight,
      reviewedRows: criterionScores.length,
      averageScore: criterionScores.length
        ? roundMetric(
            criterionScores.reduce((sum, score) => sum + score, 0) /
              criterionScores.length,
          )
        : undefined,
    };
  });

  const reviewedRows = reviewedItems.length;
  const totalRows = items.length;
  const pendingRows = Math.max(totalRows - reviewedRows, 0);

  return {
    totalRows,
    reviewedRows,
    pendingRows,
    passCount,
    failCount,
    passRate: reviewedRows ? roundMetric(passCount / reviewedRows) : 0,
    failRate: reviewedRows ? roundMetric(failCount / reviewedRows) : 0,
    overallAverageScore: overallScores.length
      ? roundMetric(
          overallScores.reduce((sum, score) => sum + score, 0) / overallScores.length,
        )
      : undefined,
    criterionAverages,
  };
}

export function parseManualEvalCriterionAverages(
  value: JsonValue | null | undefined,
  criteria: ManualEvalCriterion[],
) {
  if (!Array.isArray(value)) {
    return buildEmptyManualEvalMetrics(criteria).criterionAverages;
  }

  const entries = new Map(
    value
      .filter((entry): entry is Record<string, JsonValue | undefined> =>
        Boolean(entry && typeof entry === "object" && !Array.isArray(entry)),
      )
      .map((entry) => [
        typeof entry.criterionId === "string" ? entry.criterionId : "",
        entry,
      ]),
  );

  return criteria.map((criterion) => {
    const stored = entries.get(criterion.id);
    const averageScore =
      typeof stored?.averageScore === "number" ? stored.averageScore : undefined;
    const reviewedRows =
      typeof stored?.reviewedRows === "number" ? stored.reviewedRows : 0;

    return {
      criterionId: criterion.id,
      label: criterion.label,
      weight: criterion.weight,
      reviewedRows,
      averageScore,
    };
  });
}

export function manualEvalCriterionAveragesToJson(
  value: ManualEvalCriterionAverage[],
): JsonValue {
  return value.map((entry) => ({
    criterionId: entry.criterionId,
    label: entry.label,
    weight: entry.weight,
    reviewedRows: entry.reviewedRows,
    averageScore: entry.averageScore ?? null,
  }));
}

import type { ManualEvalCriterion, ManualEvalRunItem } from "@captar/types";

export function calculateManualEvalDraftScore(
  criteria: ManualEvalCriterion[],
  scores: Record<string, number>,
) {
  let weightedTotal = 0;
  let totalWeight = 0;

  for (const criterion of criteria) {
    const score = scores[criterion.id];

    if (typeof score !== "number") {
      continue;
    }

    weightedTotal += score * criterion.weight;
    totalWeight += criterion.weight;
  }

  if (!totalWeight) {
    return null;
  }

  return Number((weightedTotal / totalWeight).toFixed(3));
}

export function getNextPendingManualEvalItemId(
  items: ManualEvalRunItem[],
  currentItemId: string,
) {
  const currentIndex = items.findIndex((item) => item.id === currentItemId);

  return (
    items.slice(Math.max(currentIndex + 1, 0)).find((item) => !item.verdict)?.id ??
    items.find((item) => !item.verdict)?.id ??
    currentItemId
  );
}

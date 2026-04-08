import { describe, expect, it } from "vitest";

import {
  buildEmptyManualEvalMetrics,
  calculateManualEvalMetrics,
  calculateManualEvalOverallScore,
  manualEvalCriterionAveragesToJson,
  parseManualEvalCriterionAverages,
} from "../lib/manual-evals";

const criteria = [
  {
    id: "accuracy",
    position: 1,
    label: "Accuracy",
    weight: 2,
  },
  {
    id: "grounding",
    position: 2,
    label: "Grounding",
    weight: 1,
  },
] as const;

describe("manual eval helpers", () => {
  it("calculates weighted overall scores", () => {
    expect(
      calculateManualEvalOverallScore(
        [...criteria],
        [
          { criterionId: "accuracy", score: 4 },
          { criterionId: "grounding", score: 5 },
        ],
      ),
    ).toBe(4.333);
  });

  it("calculates review metrics and criterion averages", () => {
    const metrics = calculateManualEvalMetrics([...criteria], [
      {
        verdict: "pass",
        criterionScores: [
          { criterionId: "accuracy", score: 5 },
          { criterionId: "grounding", score: 4 },
        ],
      },
      {
        verdict: "fail",
        criterionScores: [
          { criterionId: "accuracy", score: 2 },
          { criterionId: "grounding", score: 3 },
        ],
      },
      {},
    ]);

    expect(metrics).toEqual({
      totalRows: 3,
      reviewedRows: 2,
      pendingRows: 1,
      passCount: 1,
      failCount: 1,
      passRate: 0.5,
      failRate: 0.5,
      overallAverageScore: 3.5,
      criterionAverages: [
        {
          criterionId: "accuracy",
          label: "Accuracy",
          weight: 2,
          reviewedRows: 2,
          averageScore: 3.5,
        },
        {
          criterionId: "grounding",
          label: "Grounding",
          weight: 1,
          reviewedRows: 2,
          averageScore: 3.5,
        },
      ],
    });
  });

  it("builds empty metrics when no reviews exist", () => {
    expect(buildEmptyManualEvalMetrics([...criteria])).toEqual({
      totalRows: 0,
      reviewedRows: 0,
      pendingRows: 0,
      passCount: 0,
      failCount: 0,
      passRate: 0,
      failRate: 0,
      criterionAverages: [
        {
          criterionId: "accuracy",
          label: "Accuracy",
          weight: 2,
          reviewedRows: 0,
        },
        {
          criterionId: "grounding",
          label: "Grounding",
          weight: 1,
          reviewedRows: 0,
        },
      ],
    });
  });

  it("round-trips stored criterion averages onto the rubric", () => {
    const json = manualEvalCriterionAveragesToJson([
      {
        criterionId: "grounding",
        label: "Grounding",
        weight: 1,
        reviewedRows: 3,
        averageScore: 4,
      },
      {
        criterionId: "accuracy",
        label: "Accuracy",
        weight: 2,
        reviewedRows: 3,
        averageScore: 3.667,
      },
    ]);

    expect(parseManualEvalCriterionAverages(json, [...criteria])).toEqual([
      {
        criterionId: "accuracy",
        label: "Accuracy",
        weight: 2,
        reviewedRows: 3,
        averageScore: 3.667,
      },
      {
        criterionId: "grounding",
        label: "Grounding",
        weight: 1,
        reviewedRows: 3,
        averageScore: 4,
      },
    ]);
  });
});

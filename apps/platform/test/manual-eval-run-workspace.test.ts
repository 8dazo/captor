import { describe, expect, it } from "vitest";

import {
  calculateManualEvalDraftScore,
  getNextPendingManualEvalItemId,
} from "../lib/manual-eval-run-workspace";

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

describe("manual eval run workspace helpers", () => {
  it("calculates the weighted draft score preview", () => {
    expect(
      calculateManualEvalDraftScore([...criteria], {
        accuracy: 4,
        grounding: 5,
      }),
    ).toBe(4.333);
  });

  it("returns null when no scores are present", () => {
    expect(calculateManualEvalDraftScore([...criteria], {})).toBeNull();
  });

  it("prefers the next pending row after the current selection", () => {
    expect(
      getNextPendingManualEvalItemId(
        [
          { id: "row-1", verdict: "pass" },
          { id: "row-2" },
          { id: "row-3" },
        ] as never,
        "row-1",
      ),
    ).toBe("row-2");
  });

  it("falls back to the current row when every row is reviewed", () => {
    expect(
      getNextPendingManualEvalItemId(
        [
          { id: "row-1", verdict: "pass" },
          { id: "row-2", verdict: "fail" },
        ] as never,
        "row-2",
      ),
    ).toBe("row-2");
  });
});

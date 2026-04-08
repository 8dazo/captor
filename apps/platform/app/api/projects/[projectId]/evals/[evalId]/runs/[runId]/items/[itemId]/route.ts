import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "../../../../../../../../../../auth";
import { saveManualEvalRunItemReview } from "../../../../../../../../../../lib/platform";

const reviewSchema = z.object({
  verdict: z.enum(["pass", "fail"]),
  notes: z.string().max(4000).optional().nullable(),
  criterionScores: z
    .array(
      z.object({
        criterionId: z.string().min(1),
        score: z.number().int().min(1).max(5),
      }),
    )
    .min(1),
});

export async function PUT(
  request: Request,
  context: {
    params: Promise<{
      projectId: string;
      evalId: string;
      runId: string;
      itemId: string;
    }>;
  },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid review payload." }, { status: 400 });
  }

  const { projectId, evalId, runId, itemId } = await context.params;

  try {
    const result = await saveManualEvalRunItemReview(
      projectId,
      evalId,
      runId,
      itemId,
      session.user.id,
      parsed.data,
    );

    if (!result) {
      return NextResponse.json({ error: "Run item not found." }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}

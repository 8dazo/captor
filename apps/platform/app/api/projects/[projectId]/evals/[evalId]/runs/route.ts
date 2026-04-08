import { NextResponse } from "next/server";

import { auth } from "../../../../../../../auth";
import { createProjectManualEvalRun } from "../../../../../../../lib/platform";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string; evalId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, evalId } = await context.params;

  try {
    const run = await createProjectManualEvalRun(projectId, evalId, session.user.id);

    if (!run) {
      return NextResponse.json({ error: "Manual eval not found." }, { status: 404 });
    }

    return NextResponse.json({ run });
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}

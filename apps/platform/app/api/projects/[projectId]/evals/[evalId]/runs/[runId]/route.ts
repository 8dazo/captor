import { NextResponse } from "next/server";

import { auth } from "../../../../../../../../auth";
import { getProjectManualEvalRunById } from "../../../../../../../../lib/platform";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; evalId: string; runId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, evalId, runId } = await context.params;
  const run = await getProjectManualEvalRunById(projectId, evalId, runId, session.user.id);

  if (!run) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}

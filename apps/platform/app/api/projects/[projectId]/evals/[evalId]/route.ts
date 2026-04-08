import { NextResponse } from "next/server";

import { auth } from "../../../../../../auth";
import { getProjectManualEvalById } from "../../../../../../lib/platform";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; evalId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, evalId } = await context.params;
  const manualEval = await getProjectManualEvalById(projectId, evalId, session.user.id);

  if (!manualEval) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(manualEval);
}

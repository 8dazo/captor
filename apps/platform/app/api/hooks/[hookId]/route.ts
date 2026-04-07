import { NextResponse } from "next/server";

import { auth } from "../../../../auth";
import { getHookByPublicId, summarizeHookAnalytics } from "../../../../lib/platform";

export async function GET(
  _request: Request,
  context: { params: Promise<{ hookId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { hookId } = await context.params;
  const hook = await getHookByPublicId(hookId, session.user.id);
  if (!hook) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    hook,
    analytics: summarizeHookAnalytics(hook),
  });
}

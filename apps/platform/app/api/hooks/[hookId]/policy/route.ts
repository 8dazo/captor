import { NextResponse } from "next/server";

import { getHookByPublicId } from "../../../../../lib/platform";

export async function GET(
  _request: Request,
  context: { params: Promise<{ hookId: string }> },
) {
  const { hookId } = await context.params;
  const hook = await getHookByPublicId(hookId);
  if (!hook) {
    return NextResponse.json({ error: "Hook not found" }, { status: 404 });
  }

  const activePolicy = hook.policies.find((policy) => policy.isActive) ?? hook.policies[0];

  return NextResponse.json({
    hook: {
      id: hook.publicId,
      payloadRetention: hook.payloadRetention,
      policy: activePolicy?.policyJson ?? {},
      policyVersion: activePolicy?.version ?? null,
    },
  });
}

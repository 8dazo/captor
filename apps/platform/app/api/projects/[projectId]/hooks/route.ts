import { NextResponse } from "next/server";
import { PayloadRetention } from "@prisma/client";
import { z } from "zod";

import { auth } from "../../../../../auth";
import { createHookConnection, getProjectById } from "../../../../../lib/platform";

const hookSchema = z.object({
  name: z.string().min(2).max(80),
  environment: z.string().min(2).max(24),
  payloadRetention: z.nativeEnum(PayloadRetention).optional(),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ hooks: project.hooks });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;
  const project = await getProjectById(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = hookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid hook input" }, { status: 400 });
  }

  const hook = await createHookConnection(project.id, parsed.data);
  return NextResponse.json({ hook });
}

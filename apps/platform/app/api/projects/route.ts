import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "../../../auth";
import { createProjectForUser, listUserProjects } from "../../../lib/platform";

const projectSchema = z.object({
  name: z.string().min(2).max(80),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const projects = await listUserProjects(session.user.id);
  return NextResponse.json({ projects });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid project input" }, { status: 400 });
  }

  const project = await createProjectForUser(session.user.id, parsed.data.name);
  return NextResponse.json({ project });
}

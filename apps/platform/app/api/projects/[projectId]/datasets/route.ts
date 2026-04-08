import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { auth } from "../../../../../auth";
import {
  createProjectDataset,
  getProjectById,
  listProjectDatasets,
} from "../../../../../lib/platform";

const datasetSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(240).optional(),
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

  const datasets = await listProjectDatasets(projectId, session.user.id);
  return NextResponse.json({ datasets });
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
  const body = await request.json();
  const parsed = datasetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid dataset input" }, { status: 400 });
  }

  try {
    const dataset = await createProjectDataset(projectId, session.user.id, parsed.data);
    if (!dataset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ dataset });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A dataset with this name already exists in the project." },
        { status: 409 },
      );
    }

    throw error;
  }
}

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { auth } from "../../../../../auth";
import {
  createProjectManualEval,
  getProjectById,
  listProjectManualEvals,
} from "../../../../../lib/platform";

const criterionSchema = z.object({
  label: z.string().min(1).max(80),
  description: z.string().max(600).optional().nullable(),
  weight: z.number().int().min(1).max(10).optional(),
});

const manualEvalSchema = z.object({
  datasetId: z.string().min(1),
  name: z.string().min(2).max(80),
  description: z.string().max(1000).optional().nullable(),
  reviewerInstructions: z.string().max(4000).optional().nullable(),
  criteria: z.array(criterionSchema).min(1),
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

  const manualEvals = await listProjectManualEvals(project.id, session.user.id);
  return NextResponse.json({ manualEvals });
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
  const parsed = manualEvalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid manual eval input." }, { status: 400 });
  }

  try {
    const manualEval = await createProjectManualEval(project.id, session.user.id, parsed.data);

    if (!manualEval) {
      return NextResponse.json({ error: "Dataset not found." }, { status: 404 });
    }

    return NextResponse.json({ manualEval });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "A manual eval with this name already exists for the dataset." },
        { status: 409 },
      );
    }

    throw error;
  }
}

import { NextResponse } from "next/server";

import type { DatasetFileFormat } from "@captar/types";

import { auth } from "../../../../../../../auth";
import { inferDatasetFileFormat } from "../../../../../../../lib/datasets";
import { importProjectDatasetRows } from "../../../../../../../lib/platform";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; datasetId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, datasetId } = await context.params;
  const formData = await request.formData();
  const file = formData.get("file");
  const formatInput = formData.get("format");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dataset file is required." }, { status: 400 });
  }

  const inferredFormat =
    typeof formatInput === "string" && formatInput.length
      ? (formatInput as DatasetFileFormat)
      : inferDatasetFileFormat(file.name);

  if (!inferredFormat) {
    return NextResponse.json(
      { error: "Could not determine dataset file format." },
      { status: 400 },
    );
  }

  const result = await importProjectDatasetRows(
    projectId,
    datasetId,
    session.user.id,
    inferredFormat,
    await file.text(),
  );

  if (!result) {
    return NextResponse.json({ error: "Dataset not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}

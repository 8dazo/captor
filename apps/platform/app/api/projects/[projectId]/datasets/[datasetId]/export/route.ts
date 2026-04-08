import { NextResponse } from "next/server";

import type { DatasetFileFormat } from "@captar/types";

import { auth } from "../../../../../../../auth";
import { exportProjectDataset } from "../../../../../../../lib/platform";

const contentTypeByFormat: Record<DatasetFileFormat, string> = {
  json: "application/json; charset=utf-8",
  jsonl: "application/x-ndjson; charset=utf-8",
  csv: "text/csv; charset=utf-8",
};

function parseFormat(value: string | null): DatasetFileFormat | null {
  if (value === "json" || value === "jsonl" || value === "csv") {
    return value;
  }

  return null;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ projectId: string; datasetId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, datasetId } = await context.params;
  const url = new URL(request.url);
  const format = parseFormat(url.searchParams.get("format")) ?? "jsonl";

  const result = await exportProjectDataset(
    projectId,
    datasetId,
    session.user.id,
    format,
  );

  if (!result) {
    return NextResponse.json({ error: "Dataset not found." }, { status: 404 });
  }

  return new NextResponse(result.content, {
    headers: {
      "content-type": contentTypeByFormat[format],
      "content-disposition": `attachment; filename=\"${result.fileName}\"`,
    },
  });
}

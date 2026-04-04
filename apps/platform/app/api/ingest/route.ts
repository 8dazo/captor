import type { ExportBatch } from "@captar/types";

import { ingestProjectEvents } from "../../../lib/control-plane";

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<ExportBatch>;

  if (!Array.isArray(payload.events)) {
    return Response.json(
      {
        accepted: 0,
        retryable: false,
        error: "events array is required",
      },
      { status: 400 },
    );
  }

  const projectId =
    payload.project ??
    payload.events.find(
      (event) =>
        typeof event.metadata?._captarProjectId === "string" &&
        event.metadata._captarProjectId,
    )?.metadata?._captarProjectId;

  if (!projectId || typeof projectId !== "string") {
    return Response.json(
      {
        accepted: 0,
        retryable: false,
        error: "project id is required via batch.project or metadata._captarProjectId",
      },
      { status: 400 },
    );
  }

  ingestProjectEvents(projectId, payload.events);

  return Response.json({
    accepted: payload.events.length,
    retryable: false,
    projectId,
  });
}

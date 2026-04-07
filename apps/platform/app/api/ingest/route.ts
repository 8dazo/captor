import type { ExportBatch } from "@captar/types";
import { NextResponse } from "next/server";

import { ingestHookBatch } from "../../../lib/platform";

export async function POST(request: Request) {
  const payload = (await request.json()) as Partial<ExportBatch>;

  if (!Array.isArray(payload.events)) {
    return NextResponse.json(
      {
        accepted: 0,
        retryable: false,
        error: "events array is required",
      },
      { status: 400 },
    );
  }

  const hookId =
    (payload as { hookId?: string }).hookId ??
    payload.events.find(
      (event) =>
        typeof event.metadata?._captarHookId === "string" &&
        event.metadata._captarHookId,
    )?.metadata?._captarHookId;

  if (!hookId || typeof hookId !== "string") {
    return NextResponse.json(
      {
        accepted: 0,
        retryable: false,
        error: "hook id is required via batch.hookId or metadata._captarHookId",
      },
      { status: 400 },
    );
  }

  try {
    const result = await ingestHookBatch(hookId, payload);

    return NextResponse.json({
      accepted: result.accepted,
      retryable: false,
      hookId,
      projectId: result.hook.projectId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        accepted: 0,
        retryable: false,
        error: error instanceof Error ? error.message : "Ingest failed",
      },
      { status: 400 },
    );
  }
}

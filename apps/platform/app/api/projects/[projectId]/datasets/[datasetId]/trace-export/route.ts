import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "../../../../../../../auth";
import { appendTraceToDataset, getTraceById } from "../../../../../../../lib/platform";

const traceExportSchema = z.object({
  traceId: z.string().min(1),
});

function traceHasPayloadSnapshot(trace: {
  promptPayload?: {
    contentRaw?: string | null;
    contentRedacted?: string | null;
  } | null;
  responsePayload?: {
    contentRaw?: string | null;
    contentRedacted?: string | null;
  } | null;
}) {
  return Boolean(
    trace.promptPayload?.contentRaw ??
      trace.promptPayload?.contentRedacted ??
      trace.responsePayload?.contentRaw ??
      trace.responsePayload?.contentRedacted,
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; datasetId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, datasetId } = await context.params;
  const body = await request.json();
  const parsed = traceExportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid trace export input." }, { status: 400 });
  }

  const trace = await getTraceById(parsed.data.traceId, session.user.id);
  if (!trace || trace.hook.projectId !== projectId) {
    return NextResponse.json({ error: "Trace not found." }, { status: 404 });
  }

  if (!traceHasPayloadSnapshot(trace)) {
    return NextResponse.json(
      { error: "No retained prompt or response payload is available for this trace." },
      { status: 400 },
    );
  }

  const result = await appendTraceToDataset(
    projectId,
    datasetId,
    trace.id,
    session.user.id,
  );

  if (!result) {
    return NextResponse.json({ error: "Dataset not found." }, { status: 404 });
  }

  return NextResponse.json(result);
}

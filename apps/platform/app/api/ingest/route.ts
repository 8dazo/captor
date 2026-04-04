import type { ExportBatch } from "@captar/types";

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

  return Response.json({
    accepted: payload.events.length,
    retryable: false,
  });
}

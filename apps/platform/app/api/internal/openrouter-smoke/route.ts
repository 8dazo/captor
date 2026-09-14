import { createCaptar } from '@captar/sdk';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'openrouter/free';

function jsonError(message: string, status: number) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET() {
  if (process.env.VERCEL_ENV !== 'production') {
    return jsonError('production-only smoke route', 404);
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return jsonError('OPENROUTER_API_KEY is not configured', 503);
  }

  const hookId = process.env.CAPTAR_HOOK_ID?.trim() || process.env.CAPTAR_DEMO_HOOK_ID?.trim();
  const ingestUrl = process.env.CAPTAR_INGEST_URL?.trim();
  const ingestApiKey = process.env.CAPTAR_INGEST_API_KEY?.trim();

  const events: string[] = [];
  const captar = createCaptar({
    project: 'production-openrouter-smoke',
    ...(hookId
      ? {
          controlPlane: {
            hookId,
            baseUrl: process.env.CAPTAR_CONTROL_PLANE_URL,
            syncPolicy: false,
          },
        }
      : {}),
    ...(ingestUrl
      ? {
          exporter: {
            url: ingestUrl,
            ...(ingestApiKey ? { apiKey: ingestApiKey } : {}),
          },
        }
      : {}),
  });

  captar.onEvent((event) => {
    events.push(event.type);
  });

  const rawClient = {
    chat: {
      completions: {
        create: async (body: Record<string, unknown>) => {
          const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${apiKey}`,
              'content-type': 'application/json',
              'http-referer': 'https://platform.captar.aurat.ai',
              'x-title': 'Captar production smoke',
            },
            body: JSON.stringify(body),
          });

          const payload = (await response.json()) as Record<string, unknown>;
          if (!response.ok) {
            throw new Error(
              `OpenRouter request failed (${response.status}): ${JSON.stringify(payload).slice(0, 300)}`,
            );
          }
          return payload;
        },
      },
    },
  };

  try {
    const session = await captar.startSession({
      budget: { maxSpendUsd: 0.01 },
      metadata: { source: 'production-openrouter-smoke' },
    });
    const client = captar.wrapOpenAI(rawClient, { session });
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: 'Reply with exactly: Captar production smoke passed',
        },
      ],
      max_tokens: 32,
    });

    const summary = await session.close();
    await captar.flush();

    const choices = Array.isArray(response.choices) ? response.choices : [];
    const first = choices[0] as { message?: { content?: string } } | undefined;

    return NextResponse.json({
      ok: true,
      modelRequested: MODEL,
      modelReturned: typeof response.model === 'string' ? response.model : null,
      output: first?.message?.content ?? null,
      usage: response.usage ?? null,
      traceId: session.trace.traceId,
      sessionId: session.id,
      summary,
      events,
      exporterConfigured: Boolean(ingestUrl),
      hookConfigured: Boolean(hookId),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'unknown error',
        events,
        exporterConfigured: Boolean(ingestUrl),
        hookConfigured: Boolean(hookId),
      },
      { status: 500 },
    );
  }
}

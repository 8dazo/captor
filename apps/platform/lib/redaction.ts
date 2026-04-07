import { PayloadRetention } from "@prisma/client";

export function extractPromptContent(payload: Record<string, unknown>) {
  if (typeof payload.input === "string") {
    return payload.input;
  }
  if (Array.isArray(payload.messages)) {
    return JSON.stringify(payload.messages);
  }
  if ("request" in payload && payload.request) {
    return JSON.stringify(payload.request);
  }
  return null;
}

export function extractResponseContent(payload: Record<string, unknown>) {
  if (typeof payload.content === "string") {
    return payload.content;
  }

  const choices = payload.choices;
  if (Array.isArray(choices) && choices.length > 0) {
    return JSON.stringify(choices);
  }

  if ("response" in payload && payload.response) {
    return JSON.stringify(payload.response);
  }
  return JSON.stringify(payload);
}

export function redactContent(
  value: string | null,
  retention: PayloadRetention,
) {
  if (!value || retention === PayloadRetention.NONE) {
    return {
      raw: null,
      redacted: null,
    };
  }

  if (retention === PayloadRetention.RAW) {
    return {
      raw: value,
      redacted: value,
    };
  }

  return {
    raw: null,
    redacted: `[REDACTED:${value.length} chars]`,
  };
}

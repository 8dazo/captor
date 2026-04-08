import { readFileSync } from "node:fs";
import path from "node:path";

import OpenAI from "openai";
import { createCaptar } from "../packages/ts/sdk/dist/index.js";

loadEnvFile(path.resolve(process.cwd(), ".env"));
loadEnvFile(new URL("./.env", import.meta.url));

const apiKey = process.env.OPENAI_API_KEY ?? process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  console.error("Missing OPENAI_API_KEY or OPENROUTER_API_KEY");
  process.exit(1);
}

const baseURL =
  process.env.OPENAI_BASE_URL ?? "https://openrouter.ai/api/v1";
const model = process.env.OPENAI_MODEL ?? "openrouter/free";
const timeoutMs = process.env.OPENAI_TIMEOUT_MS
  ? Number(process.env.OPENAI_TIMEOUT_MS)
  : 30_000;
const surface =
  process.env.OPENAI_SURFACE ??
  (baseURL.includes("openrouter.ai") ? "chat.completions" : "responses");
const isOpenRouter = baseURL.includes("openrouter.ai");
const controlPlaneBaseUrl = process.env.CAPTAR_CONTROL_PLANE_URL;
const controlPlaneHookId =
  process.env.CAPTAR_HOOK_ID ??
  process.env.CAPTAR_DEMO_HOOK_ID ??
  "hook_demo_live";
const ingestUrl = controlPlaneBaseUrl
  ? `${controlPlaneBaseUrl.replace(/\/$/, "")}/api/ingest`
  : process.env.CAPTAR_INGEST_URL;

const captar = createCaptar({
  project: "live-demo",
  exporter: ingestUrl
    ? { url: ingestUrl }
    : undefined,
  controlPlane:
    controlPlaneBaseUrl && controlPlaneHookId
      ? {
          hookId: controlPlaneHookId,
          baseUrl: controlPlaneBaseUrl,
          syncPolicy: true,
        }
      : undefined,
});

const session = await captar.startSession({
  budget: {
    maxSpendUsd: 1,
    finalizationReserveUsd: 0.1,
  },
  metadata: {
    _user: "demo-user",
    _team: "demo",
    feature: "live-openai-demo",
    provider: baseURL ? "openai-compatible" : "openai",
    ...(controlPlaneHookId
      ? { _captarHookId: controlPlaneHookId }
      : {}),
  },
  policy: {
    call: {
      allowedModels: [model],
      maxEstimatedCostUsd: 0.5,
      timeoutMs,
    },
  },
});

const client = new OpenAI({
  apiKey,
  baseURL,
  ...(isOpenRouter
    ? {
        defaultHeaders: {
          ...(process.env.OPENROUTER_HTTP_REFERER
            ? { "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER }
            : {}),
          ...(process.env.OPENROUTER_APP_TITLE
            ? { "X-Title": process.env.OPENROUTER_APP_TITLE }
            : {}),
        },
      }
    : {}),
});

const openai = captar.wrapOpenAI(client, { session });

console.log("Running live request...");
console.log(
  JSON.stringify(
    {
      baseURL,
      model,
      surface,
      controlPlaneBaseUrl: controlPlaneBaseUrl ?? "disabled",
      controlPlaneHookId: controlPlaneHookId ?? "none",
      ingest: ingestUrl ?? "disabled",
    },
    null,
    2,
  ),
);

const finishSession = async (label) => {
  let summary;
  try {
    summary = await session.close();
  } catch (error) {
    console.warn(`\n${label} session close skipped: ${error?.message ?? error}`);
    summary = session.getSummary();
  }

  try {
    await captar.flush();
  } catch (error) {
    console.warn(`\n${label} exporter flush skipped: ${error?.message ?? error}`);
  }

  return summary;
};

try {
  let response;
  if (surface === "chat.completions") {
    response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content:
            "Give me a short demo response in 3 bullet points. Mention budget control, tool guardrails, and local enforcement.",
        },
      ],
      max_tokens: 160,
    });
  } else {
    response = await openai.responses.create({
      model,
      input:
        "Give me a short demo response in 3 bullet points. Mention budget control, tool guardrails, and local enforcement.",
      max_output_tokens: 160,
    });
  }

  console.log("\nREAL PROVIDER RESPONSE");
  console.dir(response, { depth: 8, colors: true });

  console.log("\nSESSION STATE");
  console.dir(session.getState(), { depth: 6, colors: true });

  const summary = await finishSession("POST-RUN");

  console.log("\nSESSION SUMMARY");
  console.dir(summary, { depth: 6, colors: true });

  if (controlPlaneBaseUrl) {
    console.log("\nNEXT STEP");
    console.log(
      "Open the Captar platform trace view, then export the trace into a project dataset for later eval prep.",
    );
  }

  console.log("\nDONE");
} catch (error) {
  console.error("\nLIVE REQUEST FAILED");
  console.error(error?.message ?? error);
  if (error?.status) {
    console.error(`status: ${error.status}`);
  }
  if (error?.error) {
    console.error(JSON.stringify(error.error, null, 2));
  }

  console.log("\nSESSION STATE AFTER FAILURE");
  console.dir(session.getState(), { depth: 6, colors: true });

  const summary = await finishSession("FAILURE");

  console.log("\nSESSION SUMMARY AFTER FAILURE");
  console.dir(summary, { depth: 6, colors: true });

  process.exitCode = 1;
}

function loadEnvFile(url) {
  const content = readFileSync(url, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

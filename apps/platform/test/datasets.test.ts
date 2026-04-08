import { describe, expect, it } from "vitest";

import {
  buildTraceDatasetRow,
  inferDatasetFileFormat,
  normalizeDatasetRowsFromText,
  serializeDatasetRowsToText,
} from "../lib/datasets";

describe("dataset helpers", () => {
  it("builds a trace-derived dataset row with lineage and retention metadata", () => {
    const row = buildTraceDatasetRow({
      traceId: "trace_db_1",
      externalTraceId: "trace_ext_1",
      spanId: "span_req_1",
      prompt: "Summarize the ticket.",
      response: "The customer needs a refund.",
      promptRetentionMode: "redacted",
      responseRetentionMode: "raw",
      metadata: {
        provider: "openai",
        model: "gpt-4.1-mini",
      },
    });

    expect(row).toEqual({
      input: "Summarize the ticket.",
      output: "The customer needs a refund.",
      metadata: {
        provider: "openai",
        model: "gpt-4.1-mini",
      },
      source: {
        kind: "trace_export",
        traceId: "trace_db_1",
        externalTraceId: "trace_ext_1",
        spanId: "span_req_1",
        inputRetentionMode: "redacted",
        outputRetentionMode: "raw",
      },
    });
  });

  it("normalizes json imports into the shared row shape", () => {
    const rows = normalizeDatasetRowsFromText(
      JSON.stringify({
        rows: [
          {
            input: { prompt: "How many orders are late?" },
            output: { answer: 12 },
            metadata: { split: "train" },
            priority: "high",
          },
          "plain text input",
        ],
      }),
      "json",
    );

    expect(rows).toEqual([
      {
        input: { prompt: "How many orders are late?" },
        output: { answer: 12 },
        metadata: {
          split: "train",
          priority: "high",
        },
        source: {
          kind: "file_import",
          importedFormat: "json",
        },
      },
      {
        input: "plain text input",
        source: {
          kind: "file_import",
          importedFormat: "json",
        },
      },
    ]);
  });

  it("normalizes jsonl imports and keeps provided source metadata", () => {
    const rows = normalizeDatasetRowsFromText(
      [
        JSON.stringify({
          input: "Prompt A",
          output: "Answer A",
          source: {
            kind: "trace_export",
            traceId: "trace_db_a",
            externalTraceId: "trace_ext_a",
          },
        }),
        JSON.stringify({
          input: "Prompt B",
        }),
      ].join("\n"),
      "jsonl",
    );

    expect(rows).toEqual([
      {
        input: "Prompt A",
        output: "Answer A",
        source: {
          kind: "trace_export",
          traceId: "trace_db_a",
          externalTraceId: "trace_ext_a",
        },
      },
      {
        input: "Prompt B",
        source: {
          kind: "file_import",
          importedFormat: "jsonl",
        },
      },
    ]);
  });

  it("normalizes csv imports with extra columns folded into metadata", () => {
    const rows = normalizeDatasetRowsFromText(
      [
        "input,output,metadata,label,sourceKind,traceId,externalTraceId,inputRetentionMode",
        "\"Summarize case\",\"Refund approved\",\"{\"\"channel\"\":\"\"email\"\"}\",priority,trace_export,trace_db_2,trace_ext_2,redacted",
      ].join("\n"),
      "csv",
    );

    expect(rows).toEqual([
      {
        input: "Summarize case",
        output: "Refund approved",
        metadata: {
          channel: "email",
          label: "priority",
        },
        source: {
          kind: "trace_export",
          traceId: "trace_db_2",
          externalTraceId: "trace_ext_2",
          inputRetentionMode: "redacted",
        },
      },
    ]);
  });

  it("serializes dataset rows to csv with source fields and metadata", () => {
    const csv = serializeDatasetRowsToText(
      [
        {
          input: { prompt: "What changed?" },
          output: "Policy version 2",
          metadata: { split: "eval" },
          source: {
            kind: "trace_export",
            traceId: "trace_db_3",
            externalTraceId: "trace_ext_3",
            spanId: "span_3",
            inputRetentionMode: "redacted",
            outputRetentionMode: "raw",
          },
        },
      ],
      "csv",
    );

    expect(csv).toContain(
      "input,output,metadata,sourceKind,traceId,externalTraceId,spanId,inputRetentionMode,outputRetentionMode,importedFormat",
    );
    expect(csv).toContain("\"{\"\"prompt\"\":\"\"What changed?\"\"}\"");
    expect(csv).toContain("trace_export");
    expect(csv).toContain("trace_db_3");
  });

  it("infers dataset file formats from file names", () => {
    expect(inferDatasetFileFormat("captar-export.json")).toBe("json");
    expect(inferDatasetFileFormat("captar-export.jsonl")).toBe("jsonl");
    expect(inferDatasetFileFormat("captar-export.csv")).toBe("csv");
    expect(inferDatasetFileFormat("captar-export.txt")).toBeNull();
  });
});

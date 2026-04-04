import { describe, expect, it, vi } from "vitest";

import { createCaptar } from "../src/index.js";

describe("createCaptar", () => {
  it("reserves estimated spend and reconciles with actual usage", async () => {
    const captor = createCaptar({
      project: "support-bot",
    });

    const session = await captor.startSession({
      budget: {
        maxSpendUsd: 2,
        finalizationReserveUsd: 0.2,
      },
    });

    const client = {
      responses: {
        create: vi.fn(async () => ({
          model: "gpt-4.1-mini",
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        })),
      },
      chat: {
        completions: {
          create: vi.fn(async () => ({
            model: "gpt-4.1-mini",
            usage: {
              prompt_tokens: 50,
              completion_tokens: 25,
            },
          })),
        },
      },
    };

    const openai = captor.wrapOpenAI(client, { session });
    await openai.responses.create({
      model: "gpt-4.1-mini",
      input: "hello",
      max_output_tokens: 120,
    });

    const state = session.getState();
    expect(state.committedUsd).toBeGreaterThan(0);
    expect(state.reservedUsd).toBe(0);
  });

  it("blocks disallowed models before making the provider call", async () => {
    const captor = createCaptar({
      project: "support-bot",
    });

    const session = await captor.startSession({
      budget: { maxSpendUsd: 1 },
      policy: {
        call: {
          allowedModels: ["gpt-4.1-mini"],
        },
      },
    });

    const client = {
      responses: {
        create: vi.fn(async () => ({
          model: "gpt-4.1",
        })),
      },
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    };

    const openai = captor.wrapOpenAI(client, { session });

    await expect(
      openai.responses.create({
        model: "gpt-4.1",
        input: "hello",
      }),
    ).rejects.toThrow(/allow list/);
    expect(client.responses.create).not.toHaveBeenCalled();
  });

  it("tracks tool costs and preserves approval hooks", async () => {
    const captor = createCaptar({
      project: "support-bot",
    });
    const session = await captor.startSession({
      budget: { maxSpendUsd: 2 },
      policy: {
        tool: {
          requireApprovalFor: ["zendesk.createComment"],
        },
      },
    });

    const tool = captor.trackTool("zendesk.createComment", {
      session,
      estimate: 0.25,
      actual: 0.1,
      approval: true,
    });

    const result = await tool.run(async () => "ok");
    expect(result).toBe("ok");
    expect(session.getSummary().toolCallCount).toBe(1);
    expect(session.getSummary().totalCommittedUsd).toBe(0.1);
  });
});

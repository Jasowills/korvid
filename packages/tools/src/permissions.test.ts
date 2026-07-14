import { describe, it, expect } from "vitest";
import { createToolRegistry } from "./registry.js";
import { z } from "zod";
import type { KorvidConfig } from "@korvid/shared";

const mockConfig: KorvidConfig = {
  models: { reasoning: { provider: "ollama", model: "llama3.2" }, fast: { provider: "ollama", model: "llama3.2" } },
  voice: { wakeWord: { engine: "manual", keyword: "korvid", sensitivity: 0.5 }, stt: { provider: "local-whisper", streaming: false }, tts: { provider: "local" }, interruptionEnabled: true, sessionPersist: false, sessionPath: "", vad: false, vadSilenceMs: 1500, clapActivation: { enabled: false, clapWindowMs: 700, sensitivity: 0.5 } },
  gateway: { port: 3847, auth: {} },
  dashboard: { enabled: true, port: 3847 },
  delegation: { maxAttempts: 3, maxWallClockMinutes: 30, maxCostUsd: 5, sandboxImage: "", networkAllowlist: [] },
  safety: { requireConfirmationFor: [], budgetCapUsd: 50, budgetWarnPercent: 80, toolPermissions: { enabled: true, allow: [], deny: [], requireConfirmation: [] } },
  memory: { noMemoryList: [], coreMemoryPath: "", episodicMemoryPath: "", edgesPath: "" },
  messaging: { whatsapp: { enabled: false, authDir: "", dmPolicy: "pairing" as const, allowFrom: [] }, telegram: { enabled: false, dmPolicy: "pairing" as const, allowFrom: [] } },
  suggestions: { enabled: false, checkIntervalMs: 300000, maxSuggestions: 5, useReasoning: false },
  integrations: { calendar: { enabled: false, provider: "ical" }, email: { enabled: false, provider: "gmail" } },
  workflows: { enabled: false, maxConcurrent: 3, defaultTimeoutMs: 60000 },
  voicePersonality: { activeProfile: "jarvis", customProfiles: [] },
  triggers: { enabled: false, port: 3848, verifySignatures: true },
};

function makeTestTool(name: string) {
  return {
    name,
    description: `Test tool: ${name}`,
    parameters: z.object({ input: z.string() }),
    dangerous: false,
    category: "system" as const,
    execute: async () => ({ success: true, output: `ran ${name}` }),
  };
}

describe("Tool permissions", () => {
  it("allows all tools when permissions are disabled", async () => {
    const registry = createToolRegistry();
    registry.register(makeTestTool("screenshot"));
    registry.setPermissions({ enabled: false, allow: [], deny: [], requireConfirmation: [] });

    const result = await registry.execute("screenshot", { input: "test" }, mockConfig);
    expect(result.result.success).toBe(true);
  });

  it("denies tools in the deny list", async () => {
    const registry = createToolRegistry();
    registry.register(makeTestTool("run_command"));
    registry.register(makeTestTool("screenshot"));
    registry.setPermissions({ enabled: true, allow: [], deny: ["run_command"], requireConfirmation: [] });

    const denied = await registry.execute("run_command", { input: "test" }, mockConfig);
    expect(denied.result.success).toBe(false);
    expect(denied.result.error).toContain("denied");

    const allowed = await registry.execute("screenshot", { input: "test" }, mockConfig);
    expect(allowed.result.success).toBe(true);
  });

  it("only allows tools in the allow list", async () => {
    const registry = createToolRegistry();
    registry.register(makeTestTool("screenshot"));
    registry.register(makeTestTool("read_file"));
    registry.setPermissions({ enabled: true, allow: ["screenshot"], deny: [], requireConfirmation: [] });

    const allowed = await registry.execute("screenshot", { input: "test" }, mockConfig);
    expect(allowed.result.success).toBe(true);

    const denied = await registry.execute("read_file", { input: "test" }, mockConfig);
    expect(denied.result.success).toBe(false);
    expect(denied.result.error).toContain("not in the allow list");
  });

  it("deny takes precedence over allow", async () => {
    const registry = createToolRegistry();
    registry.register(makeTestTool("run_command"));
    registry.setPermissions({ enabled: true, allow: ["run_command"], deny: ["run_command"], requireConfirmation: [] });

    const result = await registry.execute("run_command", { input: "test" }, mockConfig);
    expect(result.result.success).toBe(false);
    expect(result.result.error).toContain("denied");
  });

  it("tracks budget correctly with permissions", async () => {
    const registry = createToolRegistry();
    registry.register(makeTestTool("allowed_tool"));
    registry.register(makeTestTool("denied_tool"));
    registry.setPermissions({ enabled: true, allow: [], deny: ["denied_tool"], requireConfirmation: [] });

    await registry.execute("allowed_tool", { input: "test" }, mockConfig);
    await registry.execute("denied_tool", { input: "test" }, mockConfig);

    const budget = registry.getBudget();
    expect(budget.totalCalls).toBe(2); // both count as calls
    expect(budget.byTool["allowed_tool"]?.calls).toBe(1);
    expect(budget.byTool["denied_tool"]?.calls).toBe(1);
  });
});

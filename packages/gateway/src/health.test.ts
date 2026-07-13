import { describe, it, expect } from "vitest";
import { healthCheck } from "./health.js";
import { type KorvidConfig } from "@korvid/shared";

const testConfig: KorvidConfig = {
  models: {
    reasoning: { provider: "ollama", model: "llama3.2" },
    fast: { provider: "ollama", model: "llama3.2" },
  },
  voice: {
    wakeWord: { engine: "manual", keyword: "korvid", sensitivity: 0.5 },
    stt: { provider: "local-whisper", streaming: false },
    tts: { provider: "local" },
    interruptionEnabled: true,
    sessionPersist: false,
    sessionPath: "",
    vad: false,
    vadSilenceMs: 1500,
    clapActivation: { enabled: false, clapWindowMs: 700, sensitivity: 0.5 },
  },
  gateway: { port: 19999, auth: {} },
  dashboard: { enabled: true, port: 19999 },
  delegation: {
    maxAttempts: 3,
    maxWallClockMinutes: 30,
    maxCostUsd: 5,
    sandboxImage: "openclaw-sandbox:bookworm-slim",
    networkAllowlist: [],
  },
  safety: {
    requireConfirmationFor: ["deploy", "delete", "spend", "message", "call"],
    budgetCapUsd: 50,
    budgetWarnPercent: 80,
    toolPermissions: { enabled: true, allow: [], deny: [], requireConfirmation: [] },
  },
  memory: {
    noMemoryList: [],
    coreMemoryPath: "~/.korvid/memory/core",
    episodicMemoryPath: "~/.korvid/memory/episodic",
    edgesPath: "~/.korvid/memory/edges",
  },
  messaging: {
    whatsapp: { enabled: false, allowFrom: [] },
    telegram: { enabled: false, allowFrom: [] },
  },
  suggestions: { enabled: false, checkIntervalMs: 300000, maxSuggestions: 5, useReasoning: false },
  integrations: { calendar: { enabled: false, provider: "ical" }, email: { enabled: false, provider: "gmail" } },
  workflows: { enabled: false, maxConcurrent: 3, defaultTimeoutMs: 60000 },
  voicePersonality: { activeProfile: "jarvis", customProfiles: [] },
  triggers: { enabled: false, port: 3848, verifySignatures: true },
};

describe("healthCheck", () => {
  it("returns ok: false when gateway is not running", async () => {
    const health = await healthCheck(testConfig);
    expect(health.ok).toBe(false);
    expect(health.gateway).toBe(false);
    expect(health.port).toBe(19999);
    expect(health.error).toBeDefined();
  });
});

import { describe, it, expect } from "vitest";
import { KorvidConfigSchema } from "./config.js";

describe("KorvidConfigSchema", () => {
  it("parses minimal config with defaults", () => {
    const result = KorvidConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;

    const config = result.data;
    expect(config.models.reasoning.provider).toBe("ollama");
    expect(config.models.reasoning.model).toBe("llama3.2");
    expect(config.models.fast.provider).toBe("ollama");
    expect(config.voice.wakeWord.engine).toBe("manual");
    expect(config.voice.wakeWord.keyword).toBe("korvid");
    expect(config.voice.stt.provider).toBe("local-whisper");
    expect(config.voice.tts.provider).toBe("local");
    expect(config.gateway.port).toBe(3847);
    expect(config.dashboard.port).toBe(3847);
    expect(config.delegation.maxAttempts).toBe(3);
    expect(config.safety.budgetCapUsd).toBe(50.0);
  });

  it("parses full config with all providers", () => {
    const fullConfig = {
      models: {
        reasoning: { provider: "anthropic", model: "claude-sonnet-4-6", apiKey: "sk-ant-..." },
        fast: { provider: "groq", model: "llama-3.1-8b-instant", apiKey: "gsk-..." },
        vision: { provider: "openai", model: "gpt-4o", apiKey: "sk-..." },
      },
      voice: {
        wakeWord: { engine: "porcupine", keyword: "korvid", sensitivity: 0.7 },
        stt: { provider: "deepgram", apiKey: "dg-..." },
        tts: { provider: "elevenlabs", apiKey: "el-...", voiceId: "custom-voice" },
      },
      gateway: { port: 3847, auth: { token: "my-secret" } },
      dashboard: { enabled: true, port: 3848 },
      delegation: {
        preferredAgent: "opencode",
        maxAttempts: 5,
        maxWallClockMinutes: 60,
        maxCostUsd: 10.0,
      },
      safety: {
        requireConfirmationFor: ["deploy", "delete", "spend"],
        budgetCapUsd: 100.0,
      },
      messaging: {
        telegram: { enabled: true, botToken: "123:abc", allowFrom: ["tg:123"] },
      },
    };

    const result = KorvidConfigSchema.safeParse(fullConfig);
    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.models.reasoning.provider).toBe("anthropic");
    expect(result.data.models.vision?.provider).toBe("openai");
    expect(result.data.voice.wakeWord.engine).toBe("porcupine");
    expect(result.data.voice.tts.provider).toBe("elevenlabs");
    expect(result.data.delegation.preferredAgent).toBe("opencode");
    expect(result.data.messaging.telegram.enabled).toBe(true);
  });

  it("rejects invalid provider values", () => {
    const result = KorvidConfigSchema.safeParse({
      models: {
        reasoning: { provider: "invalid-provider", model: "test" },
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid port ranges", () => {
    const result = KorvidConfigSchema.safeParse({
      gateway: { port: 80 },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid budget caps", () => {
    const result = KorvidConfigSchema.safeParse({
      safety: { budgetCapUsd: -10 },
    });
    expect(result.success).toBe(false);
  });
});

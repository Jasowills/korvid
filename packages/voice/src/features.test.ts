import { describe, it, expect, vi } from "vitest";
import { createSuggestionEngine } from "./suggestions.js";

describe("SuggestionEngine", () => {
  it("creates suggestion engine", () => {
    const mockMemory = {
      getRecentEpisodic: () => [],
      getAllCore: () => [],
    } as any;

    const engine = createSuggestionEngine({ memory: mockMemory });
    expect(engine).toBeDefined();
    expect(typeof engine.check).toBe("function");
    expect(typeof engine.start).toBe("function");
  });

  it("returns empty suggestions with no context", async () => {
    const mockMemory = {
      getRecentEpisodic: () => [],
      getAllCore: () => [],
    } as any;

    const engine = createSuggestionEngine({ memory: mockMemory });
    const suggestions = await engine.check();
    expect(suggestions).toHaveLength(0);
  });

  it("suggests follow-ups for important recent events", async () => {
    const mockMemory = {
      getRecentEpisodic: () => [
        {
          id: "ep1",
          summary: "Built voice pipeline",
          details: "Completed STT, reasoning, TTS integration",
          tags: ["voice", "build"],
          timestamp: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
          importance: 0.8,
          accessCount: 3,
          lastAccessed: Date.now() - 60000,
        },
      ],
      getAllCore: () => [],
    } as any;

    const engine = createSuggestionEngine({ memory: mockMemory });
    const suggestions = await engine.check();
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].type).toBe("follow_up");
  });
});

describe("WorkflowEngine", () => {
  it("creates and runs workflow", async () => {
    const { createWorkflowEngine } = await import("./workflow.js");
    const engine = createWorkflowEngine({});

    const workflow = engine.createWorkflow("test", [
      { name: "step1", type: "reasoning", config: { prompt: "Hello" } },
    ]);

    expect(workflow.status).toBe("idle");
    expect(workflow.steps).toHaveLength(1);
  });
});

describe("VoicePersonality", () => {
  it("creates personality manager with default profiles", async () => {
    const { createVoicePersonalityManager } = await import("./personality.js");
    const manager = createVoicePersonalityManager();

    const active = manager.getActive();
    expect(active.id).toBe("jarvis");
    expect(active.personality).toBe("dry");

    const profiles = manager.listProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(4);
  });

  it("builds system prompt from profile", async () => {
    const { createVoicePersonalityManager } = await import("./personality.js");
    const manager = createVoicePersonalityManager();

    const prompt = manager.buildSystemPrompt({
      id: "test",
      name: "Test",
      personality: "friendly",
      verbosity: "terse",
      humor: 0.7,
      warmth: 0.8,
      formality: 0.3,
    });

    expect(prompt).toContain("Korvid");
    expect(prompt).toContain("warm");
    expect(prompt).toContain("witty");
    expect(prompt).toContain("1-2 sentences");
  });

  it("creates custom profile", async () => {
    const { createVoicePersonalityManager } = await import("./personality.js");
    const manager = createVoicePersonalityManager();

    const custom = manager.createProfile({
      name: "Custom",
      personality: "casual",
      verbosity: "normal",
      humor: 0.5,
      warmth: 0.5,
      formality: 0.5,
      customTraits: ["chill"],
    });

    expect(custom.id).toBeDefined();
    expect(custom.name).toBe("Custom");

    const profiles = manager.listProfiles();
    expect(profiles.length).toBe(5); // 4 builtins + 1 custom
  });
});

describe("TriggerManager", () => {
  it("creates trigger manager", async () => {
    const { createTriggerManager } = await import("./triggers.js");
    const manager = createTriggerManager();

    expect(manager).toBeDefined();
    expect(typeof manager.register).toBe("function");
  });

  it("registers and lists triggers", async () => {
    const { createTriggerManager } = await import("./triggers.js");
    const manager = createTriggerManager();

    const trigger = manager.register({
      name: "GitHub",
      source: "github",
      enabled: true,
    });

    expect(trigger.id).toBeDefined();
    expect(manager.list()).toHaveLength(1);
  });

  it("emits manual trigger events", async () => {
    const { createTriggerManager } = await import("./triggers.js");
    const manager = createTriggerManager();

    const handler = vi.fn();
    manager.onTrigger(handler);

    manager.emitManual("test", "manual", { key: "value" });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ source: "test", type: "manual" })
    );
  });
});

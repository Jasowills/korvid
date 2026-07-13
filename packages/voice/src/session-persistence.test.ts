import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createVoicePipeline } from "./pipeline.js";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

let sessionDir: string;

beforeEach(() => {
  sessionDir = join(tmpdir(), `korvid-test-session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(sessionDir, { recursive: true });
});

afterEach(() => {
  if (existsSync(sessionDir)) rmSync(sessionDir, { recursive: true });
});

function createMockPipeline(persist: boolean, dir?: string) {
  return createVoicePipeline({
    wakeWord: { onWake: () => {}, start: async () => {}, stop: async () => {} },
    stt: { transcribe: async () => "test transcript" },
    reasoning: {
      prompt: async (text: string) => `Response to: ${text}`,
      chat: async (messages: { role: string; content: string }[]) => {
        const last = messages[messages.length - 1];
        return { text: `Response to: ${last.content}` };
      },
    },
    tts: { speak: async () => {}, stop: () => {} },
    sounds: { play: async () => {} },
    config: { sessionPersist: persist, sessionPath: dir ?? sessionDir },
  });
}

describe("Voice pipeline session persistence", () => {
  it("saves history to disk", () => {
    const pipeline = createMockPipeline(true);
    const history = pipeline.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].role).toBe("system");
  });

  it("loads persisted session on start", () => {
    const fakeHistory = [
      { role: "system", content: "You are Korvid" },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi there!" },
    ];
    writeFileSync(join(sessionDir, "history.json"), JSON.stringify(fakeHistory, null, 2));

    const pipeline = createMockPipeline(true);
    const history = pipeline.getHistory();

    expect(history.length).toBe(3);
    expect(history[1].role).toBe("user");
    expect(history[1].content).toBe("Hello");
    expect(history[2].role).toBe("assistant");
    expect(history[2].content).toBe("Hi there!");
  });

  it("clearHistory also saves empty state", () => {
    const fakeHistory = [
      { role: "system", content: "You are Korvid" },
      { role: "user", content: "test" },
    ];
    writeFileSync(join(sessionDir, "history.json"), JSON.stringify(fakeHistory, null, 2));

    const pipeline = createMockPipeline(true);
    expect(pipeline.getHistory().length).toBe(2);

    pipeline.clearHistory();
    expect(pipeline.getHistory().length).toBe(1);

    const saved = JSON.parse(readFileSync(join(sessionDir, "history.json"), "utf-8"));
    // New format: { history: [...], summarizedContext: "..." }
    expect(saved.history.length).toBe(1);
  });

  it("does not persist when sessionPersist is false", () => {
    const pipeline = createMockPipeline(false);
    expect(existsSync(join(sessionDir, "history.json"))).toBe(false);
  });
});

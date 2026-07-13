import { describe, it, expect, vi, beforeEach } from "vitest";
import { createVoicePipeline } from "./pipeline.js";
import type { PipelineState } from "./pipeline.js";

// Mock the audio-capture module
vi.mock("./audio-capture.js", () => ({
  captureAudio: vi.fn().mockResolvedValue(Buffer.from("fake-audio-data")),
}));

function createMockDeps() {
  return {
    wakeWord: {
      onWake: vi.fn(),
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    },
    stt: {
      transcribe: vi.fn().mockResolvedValue("hello korvid"),
    },
    reasoning: {
      prompt: vi.fn().mockResolvedValue("Hello! How can I help you?"),
      chat: vi.fn().mockResolvedValue({ text: "Hello! How can I help you?" }),
    },
    tts: {
      speak: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
    },
    sounds: {
      play: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe("VoicePipeline", () => {
  let deps: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    deps = createMockDeps();
  });

  it("starts in idle state", () => {
    const pipeline = createVoicePipeline(deps);
    expect(pipeline.getState()).toBe("idle");
  });

  it("registers wake word callback on start", async () => {
    const pipeline = createVoicePipeline(deps);
    await pipeline.start();
    expect(deps.wakeWord.onWake).toHaveBeenCalled();
    expect(deps.wakeWord.start).toHaveBeenCalled();
  });

  it("goes through idle → listening → processing → speaking → idle on trigger", async () => {
    const pipeline = createVoicePipeline(deps);
    await pipeline.start();

    const states: PipelineState[] = [];
    pipeline.on("state", (...args: unknown[]) => states.push(args[0] as PipelineState));

    pipeline.trigger();

    await vi.waitFor(() => {
      expect(pipeline.getState()).toBe("idle");
    });

    expect(states).toContain("listening");
    expect(states).toContain("processing");
    expect(states).toContain("speaking");
    expect(deps.sounds.play).toHaveBeenCalledWith("wake-ack");
    expect(deps.stt.transcribe).toHaveBeenCalled();
    expect(deps.reasoning.chat).toHaveBeenCalled();
    expect(deps.tts.speak).toHaveBeenCalled();
  });

  it("returns to idle if STT returns empty transcript", async () => {
    deps.stt.transcribe.mockResolvedValue("");
    const pipeline = createVoicePipeline(deps);
    await pipeline.start();

    pipeline.trigger();

    await vi.waitFor(() => {
      expect(pipeline.getState()).toBe("idle");
    });

    expect(deps.reasoning.chat).not.toHaveBeenCalled();
  });

  it("handles errors gracefully and plays failure sound", async () => {
    deps.reasoning.chat.mockRejectedValue(new Error("model unavailable"));
    const pipeline = createVoicePipeline(deps);
    await pipeline.start();

    pipeline.trigger();

    await vi.waitFor(() => {
      expect(pipeline.getState()).toBe("idle");
    });

    expect(deps.sounds.play).toHaveBeenCalledWith("failure");
  });

  it("can be stopped", async () => {
    const pipeline = createVoicePipeline(deps);
    await pipeline.start();
    await pipeline.stop();

    expect(deps.tts.stop).toHaveBeenCalled();
    expect(deps.wakeWord.stop).toHaveBeenCalled();
  });

  it("triggers via wake word callback", async () => {
    const pipeline = createVoicePipeline(deps);
    await pipeline.start();

    const wakeCallback = deps.wakeWord.onWake.mock.calls[0][0];
    wakeCallback();

    await vi.waitFor(() => {
      expect(pipeline.getState()).toBe("idle");
    });

    expect(deps.sounds.play).toHaveBeenCalledWith("wake-ack");
  });

  it("maintains conversation history", async () => {
    const pipeline = createVoicePipeline(deps);
    await pipeline.start();

    pipeline.trigger();
    await vi.waitFor(() => {
      expect(pipeline.getState()).toBe("idle");
    });

    const history = pipeline.getHistory();
    expect(history.length).toBeGreaterThanOrEqual(3);
    expect(history[0].role).toBe("system");
  });

  it("clears history", async () => {
    const pipeline = createVoicePipeline(deps);
    await pipeline.start();

    pipeline.trigger();
    await vi.waitFor(() => {
      expect(pipeline.getState()).toBe("idle");
    });

    expect(pipeline.getHistory().length).toBeGreaterThan(1);
    pipeline.clearHistory();
    expect(pipeline.getHistory().length).toBe(1);
  });
});

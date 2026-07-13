import { describe, it, expect, vi, beforeEach } from "vitest";
import { createVoicePipeline } from "./pipeline.js";

describe("VoicePipeline with Triggers", () => {
  const mockWakeWord = {
    onWake: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  };

  const mockSTT = {
    transcribe: vi.fn().mockResolvedValue("test transcript"),
  };

  const mockReasoning = {
    prompt: vi.fn().mockResolvedValue("test response"),
    chat: vi.fn().mockResolvedValue({ text: "test response" }),
  };

  const mockTTS = {
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  };

  const mockSounds = {
    play: vi.fn().mockResolvedValue(undefined),
  };

  const mockTriggers = {
    onTrigger: vi.fn(),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates pipeline with triggers", () => {
    const pipeline = createVoicePipeline({
      wakeWord: mockWakeWord,
      stt: mockSTT,
      reasoning: mockReasoning,
      tts: mockTTS,
      sounds: mockSounds,
      triggers: mockTriggers,
    });

    expect(pipeline).toBeDefined();
    expect(typeof pipeline.start).toBe("function");
  });

  it("registers trigger listener on start", async () => {
    const pipeline = createVoicePipeline({
      wakeWord: mockWakeWord,
      stt: mockSTT,
      reasoning: mockReasoning,
      tts: mockTTS,
      sounds: mockSounds,
      triggers: mockTriggers,
    });

    await pipeline.start();
    expect(mockTriggers.onTrigger).toHaveBeenCalled();
  });

  it("creates pipeline without triggers", () => {
    const pipeline = createVoicePipeline({
      wakeWord: mockWakeWord,
      stt: mockSTT,
      reasoning: mockReasoning,
      tts: mockTTS,
      sounds: mockSounds,
    });

    expect(pipeline).toBeDefined();
    expect(mockTriggers.onTrigger).not.toHaveBeenCalled();
  });
});

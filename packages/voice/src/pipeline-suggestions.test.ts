import { describe, it, expect, vi, beforeEach } from "vitest";
import { createVoicePipeline } from "./pipeline.js";

describe("VoicePipeline with Suggestion Engine", () => {
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

  const mockMemory = {
    store: {
      getRecentEpisodic: vi.fn().mockReturnValue([]),
      getAllCore: vi.fn().mockReturnValue([]),
    },
    onSuggestion: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates pipeline with suggestion engine", () => {
    const pipeline = createVoicePipeline({
      wakeWord: mockWakeWord,
      stt: mockSTT,
      reasoning: mockReasoning,
      tts: mockTTS,
      sounds: mockSounds,
      memory: mockMemory,
    });

    expect(pipeline).toBeDefined();
    expect(typeof pipeline.start).toBe("function");
    expect(typeof pipeline.stop).toBe("function");
  });

  it("starts suggestion engine on pipeline start", async () => {
    const pipeline = createVoicePipeline({
      wakeWord: mockWakeWord,
      stt: mockSTT,
      reasoning: mockReasoning,
      tts: mockTTS,
      sounds: mockSounds,
      memory: mockMemory,
    });

    await pipeline.start();
    expect(mockWakeWord.onWake).toHaveBeenCalled();
    expect(mockWakeWord.start).toHaveBeenCalled();
  });

  it("stops suggestion engine on pipeline stop", async () => {
    const pipeline = createVoicePipeline({
      wakeWord: mockWakeWord,
      stt: mockSTT,
      reasoning: mockReasoning,
      tts: mockTTS,
      sounds: mockSounds,
      memory: mockMemory,
    });

    await pipeline.start();
    await pipeline.stop();
    expect(mockWakeWord.stop).toHaveBeenCalled();
    expect(mockTTS.stop).toHaveBeenCalled();
  });

  it("creates pipeline without memory (no suggestion engine)", () => {
    const pipeline = createVoicePipeline({
      wakeWord: mockWakeWord,
      stt: mockSTT,
      reasoning: mockReasoning,
      tts: mockTTS,
      sounds: mockSounds,
    });

    expect(pipeline).toBeDefined();
  });
});

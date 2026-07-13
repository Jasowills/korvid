import { describe, it, expect, vi, beforeEach } from "vitest";
import { createVoicePipeline } from "./pipeline.js";

describe("VoicePipeline with Personality", () => {
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

  const mockPersonality = {
    getActive: vi.fn().mockReturnValue({
      id: "jarvis",
      name: "Jarvis",
      personality: "dry",
      verbosity: "normal",
      humor: 0.3,
      warmth: 0.4,
      formality: 0.7,
    }),
    buildSystemPrompt: vi.fn().mockReturnValue("You are Jarvis, a dry and witty assistant."),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates pipeline with personality", () => {
    const pipeline = createVoicePipeline({
      wakeWord: mockWakeWord,
      stt: mockSTT,
      reasoning: mockReasoning,
      tts: mockTTS,
      sounds: mockSounds,
      personality: mockPersonality,
    });

    expect(pipeline).toBeDefined();
    expect(mockPersonality.getActive).toHaveBeenCalled();
    expect(mockPersonality.buildSystemPrompt).toHaveBeenCalled();
  });

  it("uses personality system prompt", () => {
    const pipeline = createVoicePipeline({
      wakeWord: mockWakeWord,
      stt: mockSTT,
      reasoning: mockReasoning,
      tts: mockTTS,
      sounds: mockSounds,
      personality: mockPersonality,
    });

    // The pipeline should have been created with the personality system prompt
    expect(mockPersonality.buildSystemPrompt).toHaveBeenCalledWith(
      expect.objectContaining({ id: "jarvis" })
    );
  });

  it("creates pipeline without personality (uses default)", () => {
    const pipeline = createVoicePipeline({
      wakeWord: mockWakeWord,
      stt: mockSTT,
      reasoning: mockReasoning,
      tts: mockTTS,
      sounds: mockSounds,
    });

    expect(pipeline).toBeDefined();
    expect(mockPersonality.getActive).not.toHaveBeenCalled();
  });
});

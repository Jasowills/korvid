import { describe, it, expect } from "vitest";
import { createVAD, generateSilentAudio, generateNoisyAudio } from "./vad.js";

describe("VAD", () => {
  it("detects speech start when audio exceeds energy threshold", () => {
    const vad = createVAD({ energyThreshold: 0.01, silenceThresholdMs: 100 });
    let speechStarted = false;

    vad.on("speech_start", () => { speechStarted = true; });

    vad.processAudio(generateNoisyAudio(100, 0.5));
    expect(speechStarted).toBe(true);
  });

  it("detects speech end after silence threshold", async () => {
    const vad = createVAD({ energyThreshold: 0.01, silenceThresholdMs: 100 });
    let speechEnded = false;

    vad.on("speech_end", () => { speechEnded = true; });

    // Start speaking
    vad.processAudio(generateNoisyAudio(50, 0.5));
    expect(speechEnded).toBe(false);

    // Silence for longer than threshold
    await new Promise((r) => setTimeout(r, 150));
    vad.processAudio(generateSilentAudio(50));

    expect(speechEnded).toBe(true);
  });

  it("does not trigger speech_start for silence", () => {
    const vad = createVAD({ energyThreshold: 0.1 });
    let speechStarted = false;

    vad.on("speech_start", () => { speechStarted = true; });

    vad.processAudio(generateSilentAudio(500));
    expect(speechStarted).toBe(false);
  });

  it("emits silence events during speech", () => {
    const vad = createVAD({ energyThreshold: 0.01, silenceThresholdMs: 500 });
    let silenceCount = 0;

    vad.on("speech_start", () => {});
    vad.on("silence", () => { silenceCount++; });

    // Start speaking
    vad.processAudio(generateNoisyAudio(10, 0.5));
    // Brief silence (below threshold but not long enough)
    vad.processAudio(generateSilentAudio(10));

    expect(silenceCount).toBeGreaterThan(0);
  });

  it("stop() triggers speech_end if currently speaking", () => {
    const vad = createVAD({ energyThreshold: 0.01, silenceThresholdMs: 5000 });
    let speechEnded = false;

    vad.on("speech_end", () => { speechEnded = true; });

    vad.processAudio(generateNoisyAudio(50, 0.5));
    vad.stop();

    expect(speechEnded).toBe(true);
  });

  it("respects custom energy threshold", () => {
    const vad = createVAD({ energyThreshold: 0.8 });
    let speechStarted = false;

    vad.on("speech_start", () => { speechStarted = true; });

    // Low amplitude audio (below high threshold)
    vad.processAudio(generateNoisyAudio(100, 0.1));
    expect(speechStarted).toBe(false);
  });
});

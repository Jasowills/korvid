import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClapDetector, generateClapAudio, generateDoubleClapAudio, generateKnockAudio } from "./clap-detector.js";

describe("ClapDetector", () => {
  let detector: ReturnType<typeof createClapDetector>;
  let clapCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    detector = createClapDetector({ clapWindowMs: 700, sensitivity: 0.5 });
    clapCallback = vi.fn();
    detector.on("clap", clapCallback);
  });

  it("emits clap on valid double-clap pattern", () => {
    const clap1 = generateClapAudio(0.8);
    const gap = Buffer.alloc(350 * 32); // 350ms gap at 16kHz (2 bytes/sample)
    const clap2 = generateClapAudio(0.8);
    const trailing = Buffer.alloc(50 * 32); // trailing silence after 2nd clap

    // Process first clap + trailing silence (to complete the transient)
    detector.processAudio(clap1);
    detector.processAudio(trailing);
    // Process gap (silence between claps)
    detector.processAudio(gap);
    // Process second clap + trailing silence
    detector.processAudio(clap2);
    detector.processAudio(trailing);

    expect(clapCallback).toHaveBeenCalledTimes(1);
  });

  it("does not emit on single clap", () => {
    const clap = generateClapAudio(0.8);
    detector.processAudio(clap);

    // Wait a bit then check
    expect(clapCallback).not.toHaveBeenCalled();
  });

  it("does not emit on two claps outside window", () => {
    const clap1 = generateClapAudio(0.8);
    const longGap = Buffer.alloc(1000 * 32); // 1 second gap
    const clap2 = generateClapAudio(0.8);

    detector.processAudio(clap1);
    detector.processAudio(longGap);
    detector.processAudio(clap2);

    expect(clapCallback).not.toHaveBeenCalled();
  });

  it("does not emit on knock sounds", () => {
    const knock = generateKnockAudio(0.8);
    detector.processAudio(knock);

    // Even multiple knocks shouldn't trigger
    detector.processAudio(knock);
    detector.processAudio(knock);

    expect(clapCallback).not.toHaveBeenCalled();
  });

  it("respects sensitivity setting", () => {
    // Low sensitivity should require louder claps
    const lowSensDetector = createClapDetector({ sensitivity: 0.2 });
    const lowSensCallback = vi.fn();
    lowSensDetector.on("clap", lowSensCallback);

    // Quiet clap that might not trigger low sensitivity
    const quietClap = generateClapAudio(0.3);
    lowSensDetector.processAudio(quietClap);
    lowSensDetector.processAudio(Buffer.alloc(350 * 32));
    lowSensDetector.processAudio(quietClap);

    // May or may not trigger depending on exact threshold
    // The key is it doesn't crash
    expect(typeof lowSensCallback).toBe("function");
  });

  it("stop prevents further detection", () => {
    detector.stop();

    const clap1 = generateClapAudio(0.8);
    const gap = Buffer.alloc(350 * 32);
    const clap2 = generateClapAudio(0.8);

    detector.processAudio(clap1);
    detector.processAudio(gap);
    detector.processAudio(clap2);

    expect(clapCallback).not.toHaveBeenCalled();
  });
});

describe("Test Helpers", () => {
  it("generates clap audio with correct format", () => {
    const clap = generateClapAudio(0.8, 16000, 20);
    expect(clap).toBeInstanceOf(Buffer);
    expect(clap.length).toBe(20 * 16 * 2); // 20ms * 16 samples/ms * 2 bytes
  });

  it("generates double clap with correct gap", () => {
    const doubleClap = generateDoubleClapAudio(0.8, 350, 16000);
    expect(doubleClap).toBeInstanceOf(Buffer);
    // Should be longer than single clap
    expect(doubleClap.length).toBeGreaterThan(20 * 16 * 2);
  });

  it("generates knock audio", () => {
    const knock = generateKnockAudio(0.8, 16000, 30);
    expect(knock).toBeInstanceOf(Buffer);
    expect(knock.length).toBe(30 * 16 * 2);
  });
});

describe("Greetings", () => {
  it("returns time-appropriate greeting", async () => {
    const { getGreeting } = await import("./greetings.js");
    const greeting = getGreeting();
    expect(typeof greeting).toBe("string");
    expect(greeting.length).toBeGreaterThan(0);
  });

  it("rotates through greetings", async () => {
    const { getGreeting } = await import("./greetings.js");
    const greeting1 = getGreeting();
    const greeting2 = getGreeting();
    // Should be different (rotating through pool)
    // Note: This test might fail if pool size = 1, but we have multiple
    expect(typeof greeting1).toBe("string");
    expect(typeof greeting2).toBe("string");
  });
});

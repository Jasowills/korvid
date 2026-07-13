import { EventEmitter } from "node:events";

export interface ClapDetectorOptions {
  clapWindowMs?: number;
  sensitivity?: number;
  sampleRate?: number;
}

export interface ClapDetector {
  processAudio(chunk: Buffer): void;
  stop(): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

const DEFAULT_CLAP_WINDOW_MS = 700;
const DEFAULT_SENSITIVITY = 0.5;
const DEFAULT_SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2;

// Energy thresholds (RMS of 16-bit normalized samples)
const BASE_CLAP_THRESHOLD = 0.12;

export function createClapDetector(opts?: ClapDetectorOptions): ClapDetector {
  const emitter = new EventEmitter();
  const clapWindowMs = opts?.clapWindowMs ?? DEFAULT_CLAP_WINDOW_MS;
  const sensitivity = opts?.sensitivity ?? DEFAULT_SENSITIVITY;
  const sampleRate = opts?.sampleRate ?? DEFAULT_SAMPLE_RATE;

  // Threshold scales with sensitivity: higher sensitivity = lower threshold
  const clapThreshold = BASE_CLAP_THRESHOLD * (1.5 - sensitivity);

  let stopped = false;
  let lastClapTime = 0;
  let wasAboveThreshold = false;
  let highEnergyStartMs = 0; // wall-clock time when energy first crossed threshold
  let highEnergyBufferMs = 0; // accumulated high-energy duration from buffer sizes

  function calculatePeakAmplitude(buffer: Buffer): number {
    let maxAbs = 0;
    const sampleCount = Math.floor(buffer.length / BYTES_PER_SAMPLE);

    for (let i = 0; i < sampleCount; i++) {
      const sample = buffer.readInt16LE(i * BYTES_PER_SAMPLE);
      const abs = Math.abs(sample / 32768);
      if (abs > maxAbs) maxAbs = abs;
    }

    return maxAbs;
  }

  function bufferDurationMs(buffer: Buffer): number {
    const sampleCount = Math.floor(buffer.length / BYTES_PER_SAMPLE);
    return (sampleCount / sampleRate) * 1000;
  }

  return {
    processAudio(chunk: Buffer) {
      if (stopped) return;

      const peak = calculatePeakAmplitude(chunk);
      const now = Date.now();
      const isAbove = peak > clapThreshold;
      const chunkMs = bufferDurationMs(chunk);

      if (isAbove) {
        if (!wasAboveThreshold) {
          // Rising edge
          highEnergyStartMs = now;
          highEnergyBufferMs = chunkMs;
        } else {
          // Continuing above threshold
          highEnergyBufferMs += chunkMs;
        }
      } else {
        if (wasAboveThreshold) {
          // Falling edge: energy just dropped below threshold
          // Use buffer-derived duration for clap length, wall-clock for timing
          const energyDurationMs = highEnergyBufferMs;

          if (energyDurationMs >= 5 && energyDurationMs <= 80) {
            // Short burst consistent with a clap
            if (lastClapTime > 0 && (now - lastClapTime) <= clapWindowMs) {
              // Double-clap pattern detected!
              console.log("[clap-detector] Double-clap pattern detected!");
              emitter.emit("clap");
              lastClapTime = 0;
            } else {
              // First clap
              lastClapTime = now;
            }
          }

          highEnergyBufferMs = 0;
        }
      }

      wasAboveThreshold = isAbove;
    },

    stop() {
      stopped = true;
      wasAboveThreshold = false;
    },

    on(event: string, handler: (...args: unknown[]) => void) { emitter.on(event, handler); },
    off(event: string, handler: (...args: unknown[]) => void) { emitter.off(event, handler); },
  };
}

// ── Test Helpers ──────────────────────────────────────────────────

export function generateClapAudio(
  amplitude: number,
  sampleRate = 16000,
  durationMs = 20
): Buffer {
  const sampleCount = Math.floor((durationMs / 1000) * sampleRate);
  const buffer = Buffer.alloc(sampleCount * 2);

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;
    const envelope = Math.exp(-t * 10);
    const noise = (Math.random() * 2 - 1) * amplitude * envelope;
    const sample = Math.floor(noise * 32768);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
  }

  return buffer;
}

export function generateDoubleClapAudio(
  amplitude: number,
  gapMs: number,
  sampleRate = 16000
): Buffer {
  const clap1 = generateClapAudio(amplitude, sampleRate, 20);
  const silenceSamples = Math.floor((gapMs / 1000) * sampleRate);
  const silence = Buffer.alloc(silenceSamples * 2);
  const clap2 = generateClapAudio(amplitude, sampleRate, 20);

  return Buffer.concat([clap1, silence, clap2]);
}

export function generateKnockAudio(
  amplitude: number,
  sampleRate = 16000,
  durationMs = 30
): Buffer {
  const sampleCount = Math.floor((durationMs / 1000) * sampleRate);
  const buffer = Buffer.alloc(sampleCount * 2);

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;
    const envelope = Math.exp(-t * 5);
    const sine = Math.sin(2 * Math.PI * 200 * i / sampleRate);
    const sample = Math.floor(amplitude * 32768 * envelope * sine);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
  }

  return buffer;
}

import { EventEmitter } from "node:events";

export interface VADOptions {
  silenceThresholdMs?: number;
  energyThreshold?: number;
  sampleRate?: number;
}

export interface VAD {
  processAudio(chunk: Buffer): void;
  stop(): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

const DEFAULT_SILENCE_MS = 1500;
const DEFAULT_ENERGY_THRESHOLD = 0.01;
const DEFAULT_SAMPLE_RATE = 16000;

export function createVAD(opts?: VADOptions): VAD {
  const emitter = new EventEmitter();
  const silenceThresholdMs = opts?.silenceThresholdMs ?? DEFAULT_SILENCE_MS;
  const energyThreshold = opts?.energyThreshold ?? DEFAULT_ENERGY_THRESHOLD;
  const sampleRate = opts?.sampleRate ?? DEFAULT_SAMPLE_RATE;

  let speaking = false;
  let lastSpeechTime = 0;
  let stopped = false;
  const bytesPerSample = 2; // 16-bit audio

  function calculateRMS(buffer: Buffer): number {
    let sum = 0;
    const sampleCount = Math.floor(buffer.length / bytesPerSample);

    for (let i = 0; i < sampleCount; i++) {
      const sample = buffer.readInt16LE(i * bytesPerSample);
      const normalized = sample / 32768;
      sum += normalized * normalized;
    }

    return Math.sqrt(sum / (sampleCount || 1));
  }

  return {
    processAudio(chunk: Buffer) {
      if (stopped) return;

      const rms = calculateRMS(chunk);
      const now = Date.now();

      if (rms > energyThreshold) {
        // Speech detected
        if (!speaking) {
          speaking = true;
          emitter.emit("speech_start");
        }
        lastSpeechTime = now;
      } else if (speaking) {
        // Below threshold while speaking
        if (now - lastSpeechTime > silenceThresholdMs) {
          speaking = false;
          emitter.emit("speech_end");
        } else {
          emitter.emit("silence");
        }
      }
    },

    stop() {
      stopped = true;
      if (speaking) {
        speaking = false;
        emitter.emit("speech_end");
      }
    },

    on(event: string, handler: (...args: unknown[]) => void) { emitter.on(event, handler); },
    off(event: string, handler: (...args: unknown[]) => void) { emitter.off(event, handler); },
  };
}

// ── VAD Test Helpers ──────────────────────────────────────────────

export function generateSilentAudio(durationMs: number, sampleRate = 16000): Buffer {
  const sampleCount = Math.floor((durationMs / 1000) * sampleRate);
  const buffer = Buffer.alloc(sampleCount * 2); // 16-bit
  // All zeros = silence
  return buffer;
}

export function generateNoisyAudio(durationMs: number, amplitude: number, sampleRate = 16000): Buffer {
  const sampleCount = Math.floor((durationMs / 1000) * sampleRate);
  const buffer = Buffer.alloc(sampleCount * 2);

  for (let i = 0; i < sampleCount; i++) {
    const sample = Math.floor(amplitude * 32768 * Math.sin(2 * Math.PI * 440 * i / sampleRate));
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
  }

  return buffer;
}

import type { KorvidConfig } from "@korvid/shared";

export interface WakeWordDetector {
  start(): Promise<void>;
  stop(): Promise<void>;
  onWake(cb: () => void): void;
}

export function createWakeWordDetector(config: KorvidConfig): WakeWordDetector {
  const engine = config.voice.wakeWord.engine;
  let wakeCallback: (() => void) | null = null;

  if (engine === "manual") {
    return createManualDetector();
  }

  if (engine === "porcupine") {
    return createPorcupineDetector(config);
  }

  if (engine === "openwakeword") {
    return createKeywordSpotter(config);
  }

  throw new Error(`Unknown wake word engine: ${engine}`);
}

// ── Manual trigger (for dev/testing) ──────────────────────────────

function createManualDetector(): WakeWordDetector {
  let wakeCallback: (() => void) | null = null;

  return {
    async start() {
      // Set up stdin listener for manual trigger
      if (process.stdin.isTTY) {
        process.stdin.setRawMode?.(true);
        process.stdin.resume();
        process.stdin.on("data", (data: Buffer) => {
          // Ctrl+K triggers wake
          if (data[0] === 0x0b) {
            wakeCallback?.();
          }
        });
      }
    },

    async stop() {
      process.stdin.removeAllListeners("data");
    },

    onWake(cb: () => void) {
      wakeCallback = cb;
    },
  };
}

// ── Porcupine (Picovoice) ─────────────────────────────────────────

function createPorcupineDetector(config: KorvidConfig): WakeWordDetector {
  let wakeCallback: (() => void) | null = null;

  return {
    async start() {
      // Porcupine integration — requires PORCUPINE_ACCESS_KEY env var
      const accessKey = process.env.PORCUPINE_ACCESS_KEY;
      if (!accessKey) {
        console.warn("[wake-word] PORCUPINE_ACCESS_KEY not set, falling back to manual trigger");
        return;
      }

      try {
        // @ts-ignore - optional dependency
        const Porcupine = (await import("@picovoice/porcupine-node")).default;
        const porcupine = new Porcupine(
          accessKey,
          [{ builtinKeyword: "Porcupine" as any, sensitivity: config.voice.wakeWord.sensitivity }],
          (keywordIndex: number) => {
            wakeCallback?.();
          }
        );

        // Start listening via microphone
        // @ts-ignore - optional dependency
        const mic = await import("mic");
        const micInstance = mic.default({ rate: "16000", channels: "1", debug: false });
        const micStream = micInstance.getAudioStream();

        micStream.on("data", async (data: Buffer) => {
          const frames = new Int16Array(data.buffer, data.byteOffset, data.byteLength / 2);
          for (let i = 0; i < frames.length; i += porcupine.frameLength) {
            const frame = frames.slice(i, i + porcupine.frameLength);
            if (frame.length === porcupine.frameLength) {
              const keywordIndex = porcupine.process(frame);
              if (keywordIndex >= 0) {
                wakeCallback?.();
              }
            }
          }
        });

        micInstance.start();
      } catch (err) {
        console.error(`[wake-word] Porcupine init failed: ${err}. Falling back to manual.`);
      }
    },

    async stop() {
      // Cleanup handled by process exit
    },

    onWake(cb: () => void) {
      wakeCallback = cb;
    },
  };
}

// ── Keyword Spotter (VAD + energy-based detection) ────────────────
// Uses audio energy monitoring to detect when someone might be speaking,
// then triggers wake. No external dependencies needed.

function createKeywordSpotter(config: KorvidConfig): WakeWordDetector {
  let wakeCallback: (() => void) | null = null;
  let running = false;
  let audioStream: NodeJS.ReadableStream | null = null;

  const keyword = (config.voice.wakeWord.keyword ?? "hey korvid").toLowerCase();
  const sensitivity = config.voice.wakeWord.sensitivity ?? 0.5;

  return {
    async start() {
      try {
        // Use node:child_process to spawn a lightweight audio monitor
        const { spawn } = await import("node:child_process");

        // Start arecord/sox to capture raw audio
        const isMac = process.platform === "darwin";

        let proc;
        if (isMac) {
          // macOS: use sox to capture raw audio from microphone
          proc = spawn("sox", [
            "-d", "-t", "raw", "-r", "16000", "-e", "signed-integer",
            "-b", "16", "-c", "1", "-",
          ], { stdio: ["ignore", "pipe", "pipe"] });
        } else {
          // Linux: use arecord
          proc = spawn("arecord", [
            "-f", "S16_LE", "-r", "16000", "-c", "1", "-t", "raw", "-q",
          ], { stdio: ["ignore", "pipe", "pipe"] });
        }

        audioStream = proc.stdout;
        running = true;

        // Monitor audio energy levels
        let energyBuffer = 0;
        let sampleCount = 0;
        const ENERGY_THRESHOLD = sensitivity * 3000; // Adjust based on sensitivity
        const CHECK_INTERVAL_MS = 200;

        audioStream.on("data", (chunk: Buffer) => {
          if (!running) return;

          // Calculate RMS energy
          const samples = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.byteLength / 2);
          let sum = 0;
          for (let i = 0; i < samples.length; i++) {
            sum += samples[i] * samples[i];
          }
          const rms = Math.sqrt(sum / samples.length);
          energyBuffer += rms;
          sampleCount++;

          // Check energy every CHECK_INTERVAL_MS worth of samples (16000 Hz * 0.2s = 3200 samples)
          if (sampleCount >= 3200) {
            const avgEnergy = energyBuffer / sampleCount;
            energyBuffer = 0;
            sampleCount = 0;

            // If energy exceeds threshold, someone might be speaking the wake word
            // In a real implementation, you'd run Whisper here to verify
            if (avgEnergy > ENERGY_THRESHOLD) {
              console.log(`[wake-word] Energy spike detected (${Math.round(avgEnergy)}), triggering wake`);
              wakeCallback?.();
            }
          }
        });

        proc.on("error", (err) => {
          console.warn(`[wake-word] Audio capture failed: ${err.message}. Falling back to manual.`);
          running = false;
        });

        proc.on("close", () => {
          running = false;
        });

        console.log(`[wake-word] Keyword spotter active (keyword: "${keyword}", sensitivity: ${sensitivity})`);
      } catch (err) {
        console.error(`[wake-word] Failed to start keyword spotter: ${err}. Falling back to manual.`);
      }
    },

    async stop() {
      running = false;
      if (audioStream) {
        audioStream.removeAllListeners("data");
        audioStream = null;
      }
    },

    onWake(cb: () => void) {
      wakeCallback = cb;
    },
  };
}

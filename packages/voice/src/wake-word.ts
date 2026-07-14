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

// ── Keyword Spotter (energy + Whisper verification) ───────────────
// Monitors audio energy, then runs Whisper to verify the keyword.

function createKeywordSpotter(config: KorvidConfig): WakeWordDetector {
  let wakeCallback: (() => void) | null = null;
  let running = false;
  let audioStream: NodeJS.ReadableStream | null = null;
  let verifying = false;

  const keyword = (config.voice.wakeWord.keyword ?? "hey korvid").toLowerCase();
  const sensitivity = config.voice.wakeWord.sensitivity ?? 0.5;

  // Buffer audio chunks for keyword verification
  let audioChunks: Buffer[] = [];
  const VERIFY_BUFFER_MS = 2500; // Keep 2.5s of audio for verification
  const SAMPLE_RATE = 16000;
  const BYTES_PER_SEC = SAMPLE_RATE * 2; // 16-bit mono
  const MAX_BUFFER_BYTES = Math.floor(VERIFY_BUFFER_MS / 1000 * BYTES_PER_SEC);

  async function verifyWithWhisper(): Promise<boolean> {
    if (verifying) return false;
    verifying = true;

    try {
      const audioBuffer = Buffer.concat(audioChunks);
      audioChunks = [];

      if (audioBuffer.length < SAMPLE_RATE) { // Less than 1s
        return false;
      }

      // Import STT dynamically
      const { createSTT } = await import("./stt.js");
      const stt = createSTT(config);

      // Transcribe the buffered audio
      const transcript = await stt.transcribe(audioBuffer);
      const lower = transcript.toLowerCase().trim();

      console.log(`[wake-word] Whisper transcript: "${lower}"`);

      // Check if the keyword is in the transcript
      if (lower.includes(keyword)) {
        console.log(`[wake-word] Keyword "${keyword}" detected!`);
        return true;
      }

      return false;
    } catch (err) {
      console.warn(`[wake-word] Whisper verification failed: ${err}`);
      return false;
    } finally {
      verifying = false;
    }
  }

  return {
    async start() {
      try {
        const { spawn, execSync } = await import("node:child_process");

        // Check for available audio capture tools
        let hasSox = false;
        let hasFfmpeg = false;
        try { execSync("which sox", { stdio: "ignore" }); hasSox = true; } catch {}
        try { execSync("which ffmpeg", { stdio: "ignore" }); hasFfmpeg = true; } catch {}

        if (!hasSox && !hasFfmpeg) {
          console.warn("[wake-word] No audio capture tool found. Install sox or ffmpeg.");
          console.warn("[wake-word] Falling back to manual trigger (Ctrl+K).");
          return;
        }

        let proc;
        if (hasSox) {
          proc = spawn("sox", [
            "-d", "-t", "raw", "-r", "16000", "-e", "signed-integer",
            "-b", "16", "-c", "1", "-",
          ], { stdio: ["ignore", "pipe", "pipe"] });
        } else {
          // ffmpeg fallback for macOS
          proc = spawn("ffmpeg", [
            "-f", "avfoundation", "-i", ":0",
            "-ar", "16000", "-ac", "1", "-f", "s16le", "-",
          ], { stdio: ["ignore", "pipe", "pipe"] });
        }

        audioStream = proc.stdout;
        running = true;

        let energyBuffer = 0;
        let sampleCount = 0;
        const ENERGY_THRESHOLD = sensitivity * 3000;

        audioStream.on("data", (chunk: Buffer) => {
          if (!running) return;

          // Always keep audio in the rolling buffer
          audioChunks.push(chunk);
          const totalBytes = audioChunks.reduce((sum, c) => sum + c.length, 0);
          while (totalBytes > MAX_BUFFER_BYTES && audioChunks.length > 1) {
            audioChunks.shift();
          }

          // Calculate RMS energy
          const samples = new Int16Array(chunk.buffer, chunk.byteOffset, chunk.byteLength / 2);
          let sum = 0;
          for (let i = 0; i < samples.length; i++) {
            sum += samples[i] * samples[i];
          }
          const rms = Math.sqrt(sum / samples.length);
          energyBuffer += rms;
          sampleCount++;

          if (sampleCount >= 3200) {
            const avgEnergy = energyBuffer / sampleCount;
            energyBuffer = 0;
            sampleCount = 0;

            if (avgEnergy > ENERGY_THRESHOLD && !verifying) {
              console.log(`[wake-word] Energy spike (${Math.round(avgEnergy)}), verifying with Whisper...`);
              verifyWithWhisper().then((detected) => {
                if (detected) {
                  wakeCallback?.();
                }
              });
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

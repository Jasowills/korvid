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
    return createOpenWakeWordDetector(config);
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

// ── openWakeWord ──────────────────────────────────────────────────

function createOpenWakeWordDetector(config: KorvidConfig): WakeWordDetector {
  let wakeCallback: (() => void) | null = null;

  return {
    async start() {
      try {
        // @ts-ignore - optional dependency
        const oww = await import("openwakeword");

        oww.on("wake_word", (event: { word: string; confidence: number }) => {
          if (event.confidence > config.voice.wakeWord.sensitivity) {
            wakeCallback?.();
          }
        });

        await oww.start({
          model: config.voice.wakeWord.keyword,
        });
      } catch (err) {
        console.error(`[wake-word] openWakeWord init failed: ${err}. Falling back to manual.`);
      }
    },

    async stop() {
      try {
        // @ts-ignore - optional dependency
        const oww = await import("openwakeword");
        oww.stop();
      } catch {
        // ignore
      }
    },

    onWake(cb: () => void) {
      wakeCallback = cb;
    },
  };
}

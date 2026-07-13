import { spawn } from "node:child_process";
import type { KorvidConfig } from "@korvid/shared";

export interface TTSEngine {
  speak(text: string, opts?: { onInterrupt?: () => void }): Promise<void>;
  stop(): void;
}

const FETCH_TIMEOUT = 60000; // TTS can take longer for streaming

export function createTTS(config: KorvidConfig): TTSEngine {
  const ttsConfig = config.voice.tts;

  switch (ttsConfig.provider) {
    case "local":
      return createLocalTTS();
    case "elevenlabs":
      return createElevenLabsTTS(ttsConfig.apiKey!, ttsConfig.voiceId, ttsConfig.model);
    case "cartesia":
      return createCartesiaTTS(ttsConfig.apiKey!, ttsConfig.voiceId, ttsConfig.model);
    default:
      throw new Error(`Unknown TTS provider: ${ttsConfig.provider}`);
  }
}

// ── Local TTS (macOS say / espeak / piper) ───────────────────────

function createLocalTTS(): TTSEngine {
  let currentProcess: ReturnType<typeof spawn> | null = null;
  let interruptCallback: (() => void) | undefined;
  let stoppedIntentionally = false;

  return {
    async speak(text: string, opts?: { onInterrupt?: () => void }) {
      interruptCallback = opts?.onInterrupt;
      stoppedIntentionally = false;

      return new Promise<void>((resolve, reject) => {
        const isMac = process.platform === "darwin";

        const args = isMac
          ? ["-v", "Samantha", text]
          : ["-w", "-", text];

        const cmd = isMac ? "say" : "espeak";

        currentProcess = spawn(cmd, args);

        currentProcess.on("close", (code) => {
          currentProcess = null;
          if (stoppedIntentionally) {
            interruptCallback?.();
            resolve();
          } else if (code === 0) {
            resolve();
          } else {
            reject(new Error(`${cmd} exited ${code}`));
          }
        });

        currentProcess.on("error", (err) => {
          currentProcess = null;
          reject(err);
        });
      });
    },

    stop() {
      if (currentProcess) {
        stoppedIntentionally = true;
        currentProcess.kill("SIGTERM");
        currentProcess = null;
      }
    },
  };
}

// ── ElevenLabs TTS (cloud, streaming) ─────────────────────────────

function createElevenLabsTTS(
  apiKey: string,
  voiceId?: string,
  model?: string
): TTSEngine {
  let abortController: AbortController | null = null;

  return {
    async speak(text: string, opts?: { onInterrupt?: () => void }) {
      abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController!.abort(), FETCH_TIMEOUT);

      const voice = voiceId ?? "21m00Tcm4TlvDq8ikWAM";
      const ttsModel = model ?? "eleven_monolingual_v1";

      try {
        const res = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`,
          {
            method: "POST",
            headers: {
              "xi-api-key": apiKey,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              text,
              model_id: ttsModel,
              voice_settings: { stability: 0.5, similarity_boost: 0.5 },
            }),
            signal: abortController.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`ElevenLabs TTS error: ${res.status}`);
        }

        const proc = spawn("ffplay", [
          "-nodisp", "-autoexit", "-loglevel", "quiet", "-i", "pipe:0",
        ]);

        const reader = res.body?.getReader();
        if (reader) {
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              proc.stdin.write(value);
            }
            proc.stdin.end();
          };
          await pump();
        }

        return new Promise<void>((resolve, reject) => {
          proc.on("close", (code) => {
            if (code === 0 || code === null) resolve();
            else reject(new Error(`ffplay exited ${code}`));
          });
          proc.on("error", reject);
        });
      } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === "AbortError" && !abortController.signal.aborted) {
          throw new Error("ElevenLabs TTS timed out (60s)");
        }
        throw e;
      }
    },

    stop() {
      abortController?.abort();
      abortController = null;
    },
  };
}

// ── Cartesia TTS (cloud, low-latency) ─────────────────────────────

function createCartesiaTTS(
  apiKey: string,
  voiceId?: string,
  model?: string
): TTSEngine {
  let abortController: AbortController | null = null;

  return {
    async speak(text: string, opts?: { onInterrupt?: () => void }) {
      abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController!.abort(), FETCH_TIMEOUT);

      const voice = voiceId ?? "default";
      const ttsModel = model ?? "sonic-2";

      try {
        const res = await fetch(
          "https://api.cartesia.ai/tts/bytes",
          {
            method: "POST",
            headers: {
              "X-API-Key": apiKey,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            body: JSON.stringify({
              model_id: ttsModel,
              transcript: text,
              voice: { id: voice },
              output_format: { container: "mp3", encoding: "mp3", sample_rate: 44100 },
            }),
            signal: abortController.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Cartesia TTS error: ${res.status}`);
        }

        const proc = spawn("ffplay", [
          "-nodisp", "-autoexit", "-loglevel", "quiet", "-i", "pipe:0",
        ]);

        const reader = res.body?.getReader();
        if (reader) {
          const pump = async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              proc.stdin.write(value);
            }
            proc.stdin.end();
          };
          await pump();
        }

        return new Promise<void>((resolve, reject) => {
          proc.on("close", (code) => {
            if (code === 0 || code === null) resolve();
            else reject(new Error(`ffplay exited ${code}`));
          });
          proc.on("error", reject);
        });
      } catch (e: any) {
        clearTimeout(timeoutId);
        if (e.name === "AbortError" && !abortController.signal.aborted) {
          throw new Error("Cartesia TTS timed out (60s)");
        }
        throw e;
      }
    },

    stop() {
      abortController?.abort();
      abortController = null;
    },
  };
}

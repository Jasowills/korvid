import { spawn } from "node:child_process";
import { writeFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { KorvidConfig } from "@korvid/shared";

export interface STTEngine {
  transcribe(audio: Buffer): Promise<string>;
  transcribeStream?(audioStream: NodeJS.ReadableStream, onPartial?: (text: string, isFinal: boolean) => void): Promise<string>;
}

export type PartialTranscriptHandler = (text: string, isFinal: boolean) => void;

const FETCH_TIMEOUT = 30000;

export function createSTT(config: KorvidConfig): STTEngine {
  const sttConfig = config.voice.stt;

  switch (sttConfig.provider) {
    case "local-whisper":
      return createLocalWhisper();
    case "groq":
      return createGroqWhisper(sttConfig.apiKey!, sttConfig.model);
    case "deepgram":
      return createDeepgramSTT(sttConfig.apiKey!, sttConfig.model, sttConfig.streaming);
    default:
      throw new Error(`Unknown STT provider: ${sttConfig.provider}`);
  }
}

// ── Local Whisper (whisper.cpp via CLI) ───────────────────────────

function createLocalWhisper(): STTEngine {
  return {
    async transcribe(audio: Buffer): Promise<string> {
      const tmpFile = join(tmpdir(), `korvid-stt-${Date.now()}.wav`);
      await writeFile(tmpFile, audio);

      try {
        const result = await tryWhisperCpp(tmpFile).catch(() => tryPythonWhisper(tmpFile));
        return result;
      } finally {
        await unlink(tmpFile).catch(() => {});
      }
    },
  };
}

function tryWhisperCpp(audioPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("whisper", [
      audioPath,
      "--model", "base",
      "--language", "en",
      "--output-format", "txt",
      "--output-dir", tmpdir(),
    ]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`whisper.cpp exited ${code}: ${stderr}`));
        return;
      }
      const { readFileSync } = require("node:fs");
      const txtPath = audioPath.replace(/\.[^.]+$/, ".txt");
      try {
        const text = readFileSync(txtPath, "utf-8").trim();
        resolve(text);
      } catch {
        reject(new Error("Could not read whisper output"));
      }
    });

    proc.on("error", reject);
  });
}

function tryPythonWhisper(audioPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("python3", [
      "-c",
      `
import whisper
import sys
model = whisper.load_model("base")
result = model.transcribe(sys.argv[1])
print(result["text"])
      `.trim(),
      audioPath,
    ]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`python whisper exited ${code}: ${stderr}`));
        return;
      }
      resolve(stdout.trim());
    });

    proc.on("error", reject);
  });
}

// ── Groq Whisper (cloud) ──────────────────────────────────────────

function createGroqWhisper(apiKey: string, model?: string): STTEngine {
  return {
    async transcribe(audio: Buffer): Promise<string> {
      const formData = new FormData();
      formData.append("file", new Blob([audio]), "audio.wav");
      formData.append("model", model ?? "whisper-large-v3");
      formData.append("language", "en");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Groq STT error: ${res.status} ${await res.text()}`);
      }

      const result = await res.json() as { text: string };
      return result.text;
    },
  };
}

// ── Deepgram STT (cloud) ──────────────────────────────────────────

function createDeepgramSTT(apiKey: string, model?: string, streaming?: boolean): STTEngine {
  return {
    async transcribe(audio: Buffer): Promise<string> {
      const params = new URLSearchParams({
        model: model ?? "nova-3",
        language: "en",
        smart_format: "true",
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

      const res = await fetch(
        `https://api.deepgram.com/v1/listen?${params.toString()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "audio/wav",
          },
          body: audio,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Deepgram STT error: ${res.status} ${await res.text()}`);
      }

      const result = await res.json() as {
        results?: { channels?: { alternatives?: { transcript: string }[] }[] };
      };
      return result.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? "";
    },

    async transcribeStream(audioStream: NodeJS.ReadableStream, onPartial?: (text: string, isFinal: boolean) => void): Promise<string> {
      if (!streaming) {
        // Fall back to buffer-based transcription
        const chunks: Buffer[] = [];
        for await (const chunk of audioStream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return this.transcribe(Buffer.concat(chunks));
      }

      return new Promise<string>((resolve, reject) => {
        const params = new URLSearchParams({
          model: model ?? "nova-3",
          language: "en",
          smart_format: "true",
          interim_results: "true",
          endpointing: "300",
          utterance_end_ms: "1000",
        });

        const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;
        const ws = new WebSocket(wsUrl);

        let finalTranscript = "";

        ws.onopen = () => {
          ws.send(JSON.stringify({ type: "Authorization", token: apiKey }));
          ws.send(JSON.stringify({ type: "Configure", audio_format: "wav", sample_rate: 16000 }));

          // Pipe audio stream to WebSocket
          audioStream.on("data", (chunk: Buffer) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(chunk);
            }
          });

          audioStream.on("end", () => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "CloseStream" }));
            }
          });

          audioStream.on("error", (err) => {
            ws.close();
            reject(err);
          });
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(typeof event.data === "string" ? event.data : event.data.toString());
            if (msg.type === "transcript") {
              const alt = msg.channel?.alternatives?.[0];
              if (!alt) return;

              if (msg.is_final) {
                finalTranscript += alt.transcript + " ";
                onPartial?.(finalTranscript.trim(), true);
              } else {
                onPartial?.(finalTranscript + alt.transcript, false);
              }
            } else if (msg.type === "UtteranceEnd") {
              ws.close();
              resolve(finalTranscript.trim());
            }
          } catch {
            // ignore parse errors
          }
        };

        ws.onerror = (err) => {
          reject(new Error(`Deepgram WebSocket error: ${err}`));
        };

        ws.onclose = () => {
          resolve(finalTranscript.trim());
        };

        // Safety timeout
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
          resolve(finalTranscript.trim());
        }, FETCH_TIMEOUT);
      });
    },
  };
}

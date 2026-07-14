import { EventEmitter } from "node:events";
import { spawn, execFileSync } from "node:child_process";
import { readFileSync, mkdirSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export interface AudioCapture {
  startRecording(): Promise<void>;
  stopRecording(): Promise<Buffer>;
  isRecording(): boolean;
  onAudioData(cb: (chunk: Buffer) => void): void;
}

const captureDir = join(tmpdir(), "korvid-audio");

function ensureDir() {
  if (!existsSync(captureDir)) mkdirSync(captureDir, { recursive: true });
}

export function createAudioCapture(): AudioCapture {
  const emitter = new EventEmitter();
  let recording = false;
  let currentProcess: ReturnType<typeof spawn> | null = null;
  let tmpFile: string | null = null;

  ensureDir();

  return {
    async startRecording() {
      if (recording) return;
      recording = true;

      tmpFile = join(captureDir, `rec-${Date.now()}.wav`);

      try {
        const platform = process.platform;
        let soxArgs: string[];

        if (platform === "win32") {
          // Windows sox needs explicit device name
          soxArgs = ["-t", "waveaudio", "-d", "-r", "16000", "-c", "1", "-b", "16", tmpFile];
        } else {
          soxArgs = ["-d", "-r", "16000", "-c", "1", "-b", "16", tmpFile];
        }

        currentProcess = spawn("sox", soxArgs);

        currentProcess.on("error", () => {
          try {
            const platform = process.platform;
            const ffmpegFormat = platform === "darwin" ? "avfoundation"
              : platform === "win32" ? "dshow"
              : "pulse";

            currentProcess = spawn("ffmpeg", [
              "-f", ffmpegFormat,
              "-i", "",
              "-ar", "16000",
              "-ac", "1",
              "-f", "wav",
              tmpFile!,
            ]);
          } catch {
            recording = false;
            emitter.emit("error", new Error("No audio capture tool available (install sox or ffmpeg)"));
          }
        });

        currentProcess.on("close", () => {
          recording = false;
        });
      } catch {
        recording = false;
      }
    },

    async stopRecording(): Promise<Buffer> {
      if (!recording || !tmpFile) {
        return Buffer.alloc(0);
      }

      recording = false;

      if (currentProcess) {
        currentProcess.kill("SIGTERM");
        currentProcess = null;
      }

      await new Promise((r) => setTimeout(r, 200));

      try {
        const buffer = readFileSync(tmpFile);
        try { unlinkSync(tmpFile); } catch {}
        return buffer;
      } catch {
        return Buffer.alloc(0);
      }
    },

    isRecording() {
      return recording;
    },

    onAudioData(cb: (chunk: Buffer) => void) {
      emitter.on("audio", cb);
    },
  };
}

// Quick single-shot capture for voice pipeline
export async function captureAudio(durationMs = 5000): Promise<Buffer> {
  ensureDir();
  const outFile = join(captureDir, `shot-${Date.now()}.wav`);

  try {
    const platform = process.platform;
    const soxArgs = platform === "win32"
      ? ["-t", "waveaudio", "-d", "-r", "16000", "-c", "1", "-b", "16", outFile, "trim", "0", String(durationMs / 1000)]
      : ["-d", "-r", "16000", "-c", "1", "-b", "16", outFile, "trim", "0", String(durationMs / 1000)];

    execFileSync("sox", soxArgs, { timeout: durationMs + 2000, stdio: "pipe" });

    const buffer = readFileSync(outFile);
    try { unlinkSync(outFile); } catch {}
    return buffer;
  } catch {
    return Buffer.alloc(0);
  }
}

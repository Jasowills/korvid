import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { z } from "zod";

export interface VisionResult {
  success: boolean;
  text?: string;
  imagePath?: string;
  description?: string;
  frames?: string[];
  error?: string;
}

export interface VisionClient {
  captureScreen(): Promise<VisionResult>;
  analyzeImage(imagePath: string, prompt?: string): Promise<VisionResult>;
  ocr(imagePath: string): Promise<VisionResult>;
  startLiveCamera(intervalMs?: number): Promise<string>;
  stopLiveCamera(cameraId?: string): void;
  captureCameraFrame(): Promise<VisionResult>;
}

function validateImagePath(p: string): boolean {
  return resolve(p) === p && !/[;&|`$()]/.test(p);
}

const FETCH_TIMEOUT = 30000;

export function createVisionClient(opts?: { visionModel?: string; visionApiUrl?: string }): VisionClient {
  const screenshotDir = join(tmpdir(), "korvid-vision");
  if (!existsSync(screenshotDir)) mkdirSync(screenshotDir, { recursive: true });

  const cameras = new Map<string, ReturnType<typeof setInterval>>();

  return {
    async captureScreen(): Promise<VisionResult> {
      const path = join(screenshotDir, `screen-${Date.now()}.png`);
      try {
        execFileSync("screencapture", ["-x", path], { timeout: 10000, stdio: "pipe" });
        return { success: true, imagePath: path };
      } catch (err) {
        return { success: false, error: `Screenshot failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    },

    async analyzeImage(imagePath: string, prompt?: string): Promise<VisionResult> {
      if (!validateImagePath(imagePath)) {
        return { success: false, error: "Invalid image path" };
      }
      if (!existsSync(imagePath)) {
        return { success: false, error: `Image not found: ${imagePath}` };
      }

      try {
        const imageBuffer = readFileSync(imagePath);
        const base64 = imageBuffer.toString("base64");
        const analysisPrompt = prompt ?? "Describe what you see in this image in detail.";

        const model = opts?.visionModel ?? "llava";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        const res = await fetch("http://localhost:11434/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: analysisPrompt,
                images: [base64],
              },
            ],
            stream: false,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = (await res.json()) as { message?: { content?: string } };
          return { success: true, imagePath, description: data.message?.content ?? "" };
        }

        return {
          success: true,
          imagePath,
          description: `Image captured (${imageBuffer.length} bytes). Vision model unavailable — image saved for manual review.`,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("abort")) {
          return { success: false, error: "Vision analysis timed out (30s)" };
        }
        return { success: false, error: `Analysis failed: ${msg}` };
      }
    },

    async ocr(imagePath: string): Promise<VisionResult> {
      if (!validateImagePath(imagePath)) {
        return { success: false, error: "Invalid image path" };
      }
      if (!existsSync(imagePath)) {
        return { success: false, error: `Image not found: ${imagePath}` };
      }

      try {
        const swiftCode = `
import Foundation
import Vision

let path = CommandLine.arguments[1]
guard let image = NSImage(contentsOfFile: path),
      let tiffData = image.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiffData),
      let cgImage = bitmap.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("ERROR: Could not load image")
    exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try handler.perform([request])

guard let observations = request.results else { print(""); exit(0) }
let text = observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\\n")
print(text)
`;

        const swiftPath = join(screenshotDir, "ocr.swift");
        writeFileSync(swiftPath, swiftCode);

        const result = execFileSync("swift", [swiftPath, imagePath], {
          timeout: 30000,
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });

        return { success: true, imagePath, text: result.trim() || "(no text detected)" };
      } catch {
        return { success: false, error: "OCR not available — Vision framework requires macOS with Swift" };
      }
    },

    async startLiveCamera(intervalMs = 5000): Promise<string> {
      const cameraId = `cam-${Date.now()}`;
      const frames: string[] = [];

      // Use macOS imagesnap or AVFoundation to capture frames
      const captureFrame = () => {
        const path = join(screenshotDir, `camera-${cameraId}-${Date.now()}.png`);
        try {
          execFileSync("imagesnap", ["-q", path], { timeout: 10000, stdio: "pipe" });
          frames.push(path);
          // Keep only last 10 frames
          if (frames.length > 10) frames.shift();
        } catch {
          // Fallback: use screencapture for camera (not ideal but works)
          try {
            execFileSync("screencapture", ["-x", path], { timeout: 10000, stdio: "pipe" });
            frames.push(path);
            if (frames.length > 10) frames.shift();
          } catch {
            // Camera not available
          }
        }
      };

      captureFrame(); // First frame immediately
      const interval = setInterval(captureFrame, intervalMs);
      cameras.set(cameraId, interval);

      return cameraId;
    },

    stopLiveCamera(cameraId?: string) {
      if (cameraId) {
        const interval = cameras.get(cameraId);
        if (interval) {
          clearInterval(interval);
          cameras.delete(cameraId);
        }
      } else {
        for (const [id, interval] of cameras) {
          clearInterval(interval);
          cameras.delete(id);
        }
      }
    },

    async captureCameraFrame(): Promise<VisionResult> {
      const path = join(screenshotDir, `camera-capture-${Date.now()}.png`);
      try {
        execFileSync("imagesnap", ["-q", path], { timeout: 10000, stdio: "pipe" });
        return { success: true, imagePath: path };
      } catch {
        // Fallback
        try {
          execFileSync("screencapture", ["-x", path], { timeout: 10000, stdio: "pipe" });
          return { success: true, imagePath: path };
        } catch (err) {
          return { success: false, error: `Camera capture failed: ${err instanceof Error ? err.message : String(err)}` };
        }
      }
    },
  };
}

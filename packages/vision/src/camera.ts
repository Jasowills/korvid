import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

export interface CameraClient {
  startLiveCamera(intervalMs?: number): Promise<string>;
  stopLiveCamera(cameraId?: string): void;
  captureFrame(): Promise<{ success: boolean; imagePath?: string; error?: string }>;
  analyzeFrame(prompt?: string): Promise<{ success: boolean; description?: string; imagePath?: string; error?: string }>;
  isAvailable(): boolean;
}

const FETCH_TIMEOUT = 30000;

function validateImagePath(p: string): boolean {
  return resolve(p) === p && !/[;&|`$()]/.test(p);
}

export function createCameraClient(opts?: { visionModel?: string }): CameraClient {
  const cameraDir = join(tmpdir(), "korvid-camera");
  if (!existsSync(cameraDir)) mkdirSync(cameraDir, { recursive: true });

  const cameras = new Map<string, ReturnType<typeof setInterval>>();
  const frames = new Map<string, string[]>();
  let available = false;

  // Check if camera tools are available
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    execFileSync(cmd, ["imagesnap"], { stdio: "pipe" });
    available = true;
  } catch {
    // imagesnap not installed
  }

  async function captureOnce(): Promise<string> {
    const path = join(cameraDir, `frame-${Date.now()}.png`);

    const platform = process.platform;
    if (available && platform === "darwin") {
      execFileSync("imagesnap", ["-q", path], { timeout: 10000, stdio: "pipe" });
    } else if (platform === "darwin") {
      // macOS fallback to screencapture
      execFileSync("screencapture", ["-x", path], { timeout: 10000, stdio: "pipe" });
    } else if (platform === "win32") {
      // Windows: use PowerShell screen capture
      const psScript = `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $bmp = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $gfx = [System.Drawing.Graphics]::FromImage($bmp); $gfx.CopyFromScreen(0, 0, 0, 0, $bmp.Size); $bmp.Save('${path.replace(/\\/g, "\\\\")}'); $gfx.Dispose(); $bmp.Dispose()`;
      execFileSync("powershell", ["-NoProfile", "-Command", psScript], { timeout: 15000, stdio: "pipe" });
    } else {
      // Linux: try gnome-screenshot, then scrot
      try {
        execFileSync("gnome-screenshot", ["-f", path], { timeout: 10000, stdio: "pipe" });
      } catch {
        execFileSync("scrot", [path], { timeout: 10000, stdio: "pipe" });
      }
    }

    return path;
  }

  return {
    isAvailable() {
      return available;
    },

    async startLiveCamera(intervalMs = 5000): Promise<string> {
      const cameraId = `cam-${Date.now()}`;
      const cameraFrames: string[] = [];
      frames.set(cameraId, cameraFrames);

      const capture = async () => {
        try {
          const path = await captureOnce();
          cameraFrames.push(path);
          // Keep only last 10 frames
          if (cameraFrames.length > 10) {
            const old = cameraFrames.shift();
            if (old) {
              try { unlinkSync(old); } catch {}
            }
          }
        } catch (err) {
          console.error(`[camera] Frame capture failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      };

      await capture(); // First frame immediately
      const interval = setInterval(capture, intervalMs);
      cameras.set(cameraId, interval);

      return cameraId;
    },

    stopLiveCamera(cameraId?: string) {
      if (cameraId) {
        const interval = cameras.get(cameraId);
        if (interval) {
          clearInterval(interval);
          cameras.delete(cameraId);
          // Clean up frames
          const f = frames.get(cameraId);
          if (f) {
            for (const path of f) {
              try { require("node:fs").unlinkSync(path); } catch {}
            }
            frames.delete(cameraId);
          }
        }
      } else {
        for (const [id, interval] of cameras) {
          clearInterval(interval);
          cameras.delete(id);
        }
        for (const [id, f] of frames) {
          for (const path of f) {
            try { unlinkSync(path); } catch {}
          }
          frames.delete(id);
        }
      }
    },

    async captureFrame() {
      try {
        const path = await captureOnce();
        return { success: true, imagePath: path };
      } catch (err) {
        return { success: false, error: `Camera capture failed: ${err instanceof Error ? err.message : String(err)}` };
      }
    },

    async analyzeFrame(prompt?: string) {
      try {
        const path = await captureOnce();
        const imageBuffer = readFileSync(path);
        const base64 = imageBuffer.toString("base64");
        const analysisPrompt = prompt ?? "Describe what the camera sees in detail.";

        const model = opts?.visionModel ?? "llava";
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

        const res = await fetch("http://localhost:11434/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: analysisPrompt, images: [base64] }],
            stream: false,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const data = (await res.json()) as { message?: { content?: string } };
          return { success: true, description: data.message?.content ?? "", imagePath: path };
        }

        return { success: true, description: `Image captured (${imageBuffer.length} bytes). Vision model unavailable.`, imagePath: path };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("abort")) {
          return { success: false, error: "Vision analysis timed out (30s)" };
        }
        return { success: false, error: `Analysis failed: ${msg}` };
      }
    },
  };
}

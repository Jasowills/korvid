import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { z } from "zod";
import type { Tool } from "./types.js";

const screenshotParams = z.object({
  path: z.string().optional().describe("File path to save screenshot"),
  region: z.string().optional().describe("Region to capture, e.g. '0,0,800,600' (x,y,w,h)"),
  fullscreen: z.boolean().optional().describe("Capture full screen (default: true)"),
});

function validateRegion(region: string): boolean {
  return /^\d+,\d+,\d+,\d+$/.test(region);
}

function platformScreenshot(outputPath: string, region?: string, fullscreen?: boolean): void {
  const platform = process.platform;

  if (platform === "darwin") {
    const args = ["-x"];
    if (region) {
      args.push("-R", region);
    } else if (fullscreen === false) {
      args.push("-i");
    }
    args.push(outputPath);
    execFileSync("screencapture", args, { timeout: 10000, stdio: "pipe" });
  } else if (platform === "win32") {
    // PowerShell screenshot capture
    const psScript = `Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; $bmp = New-Object System.Drawing.Bitmap([System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Width, [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Height); $gfx = [System.Drawing.Graphics]::FromImage($bmp); $gfx.CopyFromScreen(0, 0, 0, 0, $bmp.Size); $bmp.Save('${outputPath.replace(/\\/g, "\\\\")}'); $gfx.Dispose(); $bmp.Dispose()`;
    execFileSync("powershell", ["-NoProfile", "-Command", psScript], { timeout: 15000, stdio: "pipe" });
  } else {
    // Linux: try gnome-screenshot, then scrot, then import (ImageMagick)
    try {
      execFileSync("gnome-screenshot", ["-f", outputPath], { timeout: 10000, stdio: "pipe" });
    } catch {
      try {
        execFileSync("scrot", [outputPath], { timeout: 10000, stdio: "pipe" });
      } catch {
        execFileSync("import", ["-window", "root", outputPath], { timeout: 10000, stdio: "pipe" });
      }
    }
  }
}

export const screenshotTool: Tool = {
  name: "screenshot",
  description: "Capture a screenshot of the current screen or a specific region",
  parameters: screenshotParams,
  dangerous: false,
  category: "system",
  async execute(params) {
    const p = screenshotParams.parse(params);
    const outputPath = p.path ?? join(tmpdir(), `korvid-screenshot-${Date.now()}.png`);

    try {
      platformScreenshot(resolve(outputPath), p.region, p.fullscreen);
      const resolvedOutput = resolve(outputPath);
      return {
        success: true,
        output: `Screenshot saved to ${resolvedOutput}`,
        metadata: { path: resolvedOutput },
      };
    } catch (err) {
      return {
        success: false,
        output: "",
        error: `Screenshot failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  },
};

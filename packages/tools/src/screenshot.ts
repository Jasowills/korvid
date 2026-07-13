import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { z } from "zod";
import type { Tool } from "./types.js";

const screenshotParams = z.object({
  path: z.string().optional().describe("File path to save screenshot (defaults to /tmp/korvid-screenshot.png)"),
  region: z.string().optional().describe("Region to capture, e.g. '0,0,800,600' (x,y,w,h)"),
  fullscreen: z.boolean().optional().describe("Capture full screen (default: true)"),
});

function validateRegion(region: string): boolean {
  return /^\d+,\d+,\d+,\d+$/.test(region);
}

export const screenshotTool: Tool = {
  name: "screenshot",
  description: "Capture a screenshot of the current screen or a specific region",
  parameters: screenshotParams,
  dangerous: false,
  category: "system",
  async execute(params) {
    const p = screenshotParams.parse(params);
    const outputPath = p.path ?? `/tmp/korvid-screenshot-${Date.now()}.png`;

    // Validate outputPath to prevent path traversal
    const resolvedOutput = resolve(outputPath);
    if (!resolvedOutput.startsWith("/tmp/") && !resolvedOutput.startsWith("/var/tmp/")) {
      return { success: false, output: "", error: "Screenshots must be saved to /tmp or /var/tmp" };
    }

    try {
      const args = ["-x"];
      if (p.region) {
        if (!validateRegion(p.region)) {
          return { success: false, output: "", error: "Invalid region format. Use x,y,w,h (e.g., '0,0,800,600')" };
        }
        args.push("-R", p.region);
      } else if (p.fullscreen === false) {
        args.push("-i");
      }
      args.push(resolvedOutput);

      execFileSync("screencapture", args, { timeout: 10000, stdio: "pipe" });

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

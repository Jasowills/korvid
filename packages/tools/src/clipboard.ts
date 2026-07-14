import { execSync, execFileSync } from "node:child_process";
import { z } from "zod";
import type { Tool } from "./types.js";

const clipboardReadParams = z.object({});

const clipboardWriteParams = z.object({
  text: z.string().describe("Text to copy to clipboard"),
});

function platformClipboardRead(): string {
  const platform = process.platform;
  if (platform === "darwin") {
    return execSync("pbpaste", { timeout: 5000, encoding: "utf-8" });
  } else if (platform === "win32") {
    return execFileSync("powershell", ["-NoProfile", "-Command", "Get-Clipboard"], { timeout: 5000, encoding: "utf-8" });
  } else {
    // Linux: try xclip, then xsel
    try {
      return execFileSync("xclip", ["-selection", "clipboard", "-o"], { timeout: 5000, encoding: "utf-8" });
    } catch {
      return execFileSync("xsel", ["--clipboard", "--output"], { timeout: 5000, encoding: "utf-8" });
    }
  }
}

function platformClipboardWrite(text: string): void {
  const platform = process.platform;
  if (platform === "darwin") {
    execSync("pbcopy", { input: text, timeout: 5000, stdio: "pipe" });
  } else if (platform === "win32") {
    execFileSync("powershell", ["-NoProfile", "-Command", `Set-Clipboard -Value "${text.replace(/"/g, '`"')}"`], { timeout: 5000, stdio: "pipe" });
  } else {
    // Linux: try xclip, then xsel
    try {
      execFileSync("xclip", ["-selection", "clipboard"], { input: text, timeout: 5000, stdio: "pipe" });
    } catch {
      execFileSync("xsel", ["--clipboard", "--input"], { input: text, timeout: 5000, stdio: "pipe" });
    }
  }
}

export const clipboardReadTool: Tool = {
  name: "clipboard_read",
  description: "Read the current clipboard contents",
  parameters: clipboardReadParams,
  dangerous: false,
  category: "clipboard",
  async execute() {
    try {
      const text = platformClipboardRead();
      return { success: true, output: text || "(empty clipboard)" };
    } catch (err) {
      return { success: false, output: "", error: `Failed to read clipboard: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};

export const clipboardWriteTool: Tool = {
  name: "clipboard_write",
  description: "Write text to the clipboard",
  parameters: clipboardWriteParams,
  dangerous: false,
  category: "clipboard",
  async execute(params) {
    const p = clipboardWriteParams.parse(params);
    try {
      platformClipboardWrite(p.text);
      return { success: true, output: `Copied ${p.text.length} characters to clipboard` };
    } catch (err) {
      return { success: false, output: "", error: `Failed to write clipboard: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};

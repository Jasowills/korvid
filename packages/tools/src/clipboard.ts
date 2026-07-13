import { execSync } from "node:child_process";
import { z } from "zod";
import type { Tool } from "./types.js";

const clipboardReadParams = z.object({});

const clipboardWriteParams = z.object({
  text: z.string().describe("Text to copy to clipboard"),
});

export const clipboardReadTool: Tool = {
  name: "clipboard_read",
  description: "Read the current clipboard contents",
  parameters: clipboardReadParams,
  dangerous: false,
  category: "clipboard",
  async execute() {
    try {
      const text = execSync("pbpaste", { timeout: 5000, encoding: "utf-8" });
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
      execSync("pbcopy", { input: p.text, timeout: 5000, stdio: "pipe" });
      return { success: true, output: `Copied ${p.text.length} characters to clipboard` };
    } catch (err) {
      return { success: false, output: "", error: `Failed to write clipboard: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};

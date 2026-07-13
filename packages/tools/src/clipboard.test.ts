import { describe, it, expect } from "vitest";
import { clipboardReadTool, clipboardWriteTool } from "../src/clipboard.js";

describe("Clipboard tools", () => {
  it("clipboard_read returns a result", async () => {
    const result = await clipboardReadTool.execute({});
    expect(result).toHaveProperty("success");
    expect(typeof result.output).toBe("string");
  });

  it("clipboard_write writes to clipboard", async () => {
    const result = await clipboardWriteTool.execute({ text: "korvid test" });
    expect(result.success).toBe(true);
  });
});

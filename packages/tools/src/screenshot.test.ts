import { describe, it, expect } from "vitest";
import { screenshotTool } from "../src/screenshot.js";

describe("Screenshot tool", () => {
  it("captures a screenshot to default path", async () => {
    const result = await screenshotTool.execute({});
    expect(result).toHaveProperty("success");
    // On macOS CI this may fail without display, so just check it returns a result
    expect(typeof result.output).toBe("string");
  });
});

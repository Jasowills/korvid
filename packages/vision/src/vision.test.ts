import { describe, it, expect } from "vitest";
import { createVisionClient } from "../src/vision.js";

describe("VisionClient", () => {
  const client = createVisionClient();

  it("captureScreen returns a result", async () => {
    const result = await client.captureScreen();
    expect(result).toHaveProperty("success");
    expect(typeof result.success).toBe("boolean");
  });

  it("analyzeImage fails for nonexistent file", async () => {
    const result = await client.analyzeImage("/nonexistent/image.png");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("ocr fails for nonexistent file", async () => {
    const result = await client.ocr("/nonexistent/image.png");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });
});

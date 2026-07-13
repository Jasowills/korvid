import { describe, it, expect } from "vitest";
import { runCommandTool } from "../src/command.js";

describe("Command tool", () => {
  it("runs a simple command", async () => {
    const result = await runCommandTool.execute({ command: "echo hello" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("hello");
  });

  it("blocks dangerous commands", async () => {
    const result = await runCommandTool.execute({ command: "rm -rf /" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Blocked");
  });

  it("reports command failures", async () => {
    const result = await runCommandTool.execute({ command: "ls /nonexistent-path-xyz" });
    expect(result.success).toBe(false);
  });
});

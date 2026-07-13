import { describe, it, expect } from "vitest";
import { listFilesTool, readFileTool, writeFileTool } from "../src/filesystem.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileSync, mkdirSync } from "node:fs";

describe("Filesystem tools", () => {
  const testDir = join(tmpdir(), "korvid-tools-test");
  const testFile = join(testDir, "test.txt");

  it("list_files lists directory contents", async () => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(testFile, "hello");
    const result = await listFilesTool.execute({ path: testDir });
    expect(result.success).toBe(true);
    expect(result.output).toContain("test.txt");
  });

  it("read_file reads file contents", async () => {
    const result = await readFileTool.execute({ path: testFile });
    expect(result.success).toBe(true);
    expect(result.output).toBe("hello");
  });

  it("write_file writes file contents", async () => {
    const writeFile = join(testDir, "written.txt");
    const result = await writeFileTool.execute({ path: writeFile, content: "world" });
    expect(result.success).toBe(true);
  });

  it("blocks paths in /etc", async () => {
    const result = await readFileTool.execute({ path: "/etc/hosts" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("blocked");
  });
});

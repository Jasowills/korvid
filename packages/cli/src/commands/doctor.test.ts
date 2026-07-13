import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("korvid doctor", { timeout: 15000 }, () => {
  it("runs without crashing", () => {
    const cliEntry = resolve(__dirname, "../../dist/index.js");
    const result = execFileSync("node", [cliEntry, "doctor"], {
      encoding: "utf-8",
      timeout: 15000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    expect(result).toContain("Korvid Doctor");
    expect(result).toContain("Node.js");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSimulateMode } from "./simulate-mode.js";

describe("SimulateMode", () => {
  let simulate: ReturnType<typeof createSimulateMode>;

  beforeEach(() => {
    simulate = createSimulateMode({});
  });

  it("simulates a small change with high confidence", async () => {
    const result = await simulate.simulate({
      description: "Fix typo in README",
      filesChanged: ["README.md"],
      changeType: "fix",
      hasTests: false,
      workspacePath: "/tmp/test",
    });

    expect(result.estimatedRisk.confidence).toBeGreaterThan(0.4);
    expect(result.validationPreview.filesAffected).toEqual(["README.md"]);
  });

  it("simulates a risky change with low confidence", async () => {
    const result = await simulate.simulate({
      description: "Major refactor of auth system",
      filesChanged: Array.from({ length: 20 }, (_, i) => `src/auth/${i}.ts`),
      changeType: "refactor",
      hasTests: true,
      testCoverage: 0.3,
      workspacePath: "/tmp/test",
    });

    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("generates readable explanation", async () => {
    const result = await simulate.simulate({
      description: "Add feature",
      filesChanged: ["src/feature.ts", "src/feature.test.ts"],
      changeType: "feature",
      workspacePath: "/tmp/test",
    });

    const explanation = simulate.explainResult(result);
    expect(explanation).toContain("Simulation:");
    expect(explanation).toContain("Would pass:");
  });

  it("provides recommendations for risky changes", async () => {
    const result = await simulate.simulate({
      description: "Fix bug",
      filesChanged: Array.from({ length: 15 }, (_, i) => `file${i}.ts`),
      changeType: "fix",
      hasTests: true,
      workspacePath: "/tmp/test",
    });

    const largeChangeRec = result.recommendations.find((r) => r.includes("Large change"));
    expect(largeChangeRec).toBeDefined();
  });
});

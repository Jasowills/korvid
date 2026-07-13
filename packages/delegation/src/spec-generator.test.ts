import { describe, it, expect } from "vitest";
import { generateSpec, formatSpecForAgent } from "./spec-generator.js";

describe("generateSpec", () => {
  it("generates a spec from a request string", () => {
    const spec = generateSpec("Add a login button\nMust be accessible\nShould use ARIA labels", "opencode");

    expect(spec.id).toMatch(/^spec-/);
    expect(spec.title).toBe("Add a login button");
    expect(spec.requirements).toContain("Must be accessible");
    expect(spec.requirements).toContain("Should use ARIA labels");
    expect(spec.targetAgent).toBe("opencode");
  });

  it("provides defaults when request has minimal info", () => {
    const spec = generateSpec("Fix the bug", "claude");
    expect(spec.title).toBe("Fix the bug");
    expect(spec.requirements.length).toBeGreaterThan(0);
    expect(spec.acceptanceCriteria.length).toBeGreaterThan(0);
  });
});

describe("formatSpecForAgent", () => {
  it("formats spec as markdown", () => {
    const spec = generateSpec("Test task", "opencode");
    const formatted = formatSpecForAgent(spec);

    expect(formatted).toContain("# Task Specification");
    expect(formatted).toContain("Test task");
    expect(formatted).toContain("## Requirements");
    expect(formatted).toContain("## Acceptance Criteria");
  });
});

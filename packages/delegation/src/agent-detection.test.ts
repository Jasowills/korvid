import { describe, it, expect } from "vitest";
import { detectAgents } from "./agent-detection.js";

describe("detectAgents", { timeout: 15000 }, () => {
  it("returns an array of agent info objects", () => {
    const agents = detectAgents();
    expect(Array.isArray(agents)).toBe(true);
    expect(agents.length).toBeGreaterThan(0);
  });

  it("each agent has required fields", () => {
    const agents = detectAgents();
    for (const agent of agents) {
      expect(agent).toHaveProperty("id");
      expect(agent).toHaveProperty("name");
      expect(agent).toHaveProperty("available");
      expect(typeof agent.available).toBe("boolean");
    }
  });
});

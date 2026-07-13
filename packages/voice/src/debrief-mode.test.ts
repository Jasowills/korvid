import { describe, it, expect, vi, beforeEach } from "vitest";
import { createDebriefMode } from "./debrief-mode.js";

describe("DebriefMode", () => {
  let debrief: ReturnType<typeof createDebriefMode>;

  beforeEach(() => {
    debrief = createDebriefMode({});
  });

  it("records task completions", () => {
    debrief.recordTaskCompletion("task-1", "Deploy to staging", "success");
    const items = debrief.getItemsSince(0);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe("task_completed");
    expect(items[0].outcome).toBe("success");
  });

  it("records events", () => {
    debrief.recordEvent("reminder", "Check email", 0.7);
    const items = debrief.getItemsSince(0);
    expect(items).toHaveLength(1);
    expect(items[0].message).toBe("Check email");
  });

  it("generates debrief summary", async () => {
    debrief.recordTaskCompletion("task-1", "Deploy", "success");
    debrief.recordTaskCompletion("task-2", "Test", "failure", "Tests timed out");
    debrief.recordEvent("held_item", "Reminder held during lockdown", 0.5);

    const summary = await debrief.generateDebrief(0);
    expect(summary).toContain("Deploy");
    expect(summary).toContain("Test");
  });

  it("returns default message when no items", async () => {
    const summary = await debrief.generateDebrief(Date.now());
    expect(summary).toBe("Nothing new since you were away.");
  });

  it("generates debrief with reasoning", async () => {
    const mockReasoning = { prompt: vi.fn().mockResolvedValue("Quick summary: 2 tasks completed, 1 held item.") };
    debrief = createDebriefMode({ reasoning: mockReasoning });

    debrief.recordTaskCompletion("task-1", "Deploy", "success");
    debrief.recordTaskCompletion("task-2", "Test", "failure");
    debrief.recordEvent("held_item", "Reminder", 0.5);
    debrief.recordEvent("status", "Another event", 0.3);

    const summary = await debrief.generateDebrief(0);
    expect(summary).toBe("Quick summary: 2 tasks completed, 1 held item.");
    expect(mockReasoning.prompt).toHaveBeenCalled();
  });

  it("clears held items", () => {
    debrief.recordEvent("held_item", "Item 1", 0.5);
    debrief.recordEvent("reminder", "Item 2", 0.3);
    debrief.recordEvent("status", "Item 3", 0.2);

    debrief.clearHeldItems();
    const held = debrief.getHeldItems();
    expect(held).toHaveLength(0);
  });
});

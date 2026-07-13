import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createFocusMode } from "./focus-mode.js";

describe("FocusMode", () => {
  let focus: ReturnType<typeof createFocusMode>;

  beforeEach(() => {
    focus = createFocusMode();
  });

  afterEach(() => {
    // Clean up any timers
    if (focus.isActive()) {
      focus.deactivate();
    }
  });

  it("activates and deactivates", () => {
    expect(focus.isActive()).toBe(false);

    focus.activate();
    expect(focus.isActive()).toBe(true);

    const items = focus.deactivate();
    expect(focus.isActive()).toBe(false);
    expect(items).toHaveLength(0);
  });

  it("holds items while active", () => {
    focus.activate();
    focus.holdItem({ type: "reminder", message: "Check email", priority: 0.5 });
    focus.holdItem({ type: "suggestion", message: "Run tests", priority: 0.3 });

    const items = focus.getHeldItems();
    expect(items).toHaveLength(2);
  });

  it("surfaces held items on deactivate", () => {
    focus.activate();
    focus.holdItem({ type: "reminder", message: "Check email", priority: 0.5 });
    focus.holdItem({ type: "suggestion", message: "Run tests", priority: 0.3 });

    const items = focus.deactivate();
    expect(items).toHaveLength(2);
    expect(focus.getHeldItems()).toHaveLength(0);
  });

  it("suppresses non-urgent items when active", () => {
    focus.activate();
    expect(focus.isSuppressed("reminder")).toBe(true);
    expect(focus.isSuppressed("suggestion")).toBe(true);
    expect(focus.isSuppressed("notification")).toBe(true);
  });

  it("does not suppress direct requests", () => {
    focus.activate();
    expect(focus.isSuppressed("direct_request")).toBe(false);
  });

  it("does not suppress urgent items", () => {
    focus.activate();
    expect(focus.isSuppressed("urgent")).toBe(false);
  });

  it("auto-deactivates after duration", async () => {
    focus.activate({ durationMs: 50 });
    expect(focus.isActive()).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(focus.isActive()).toBe(false);
  });

  it("emits state change events", () => {
    const handler = vi.fn();
    focus.onStateChange(handler);

    focus.activate();
    expect(handler).toHaveBeenCalledWith(true);

    focus.deactivate();
    expect(handler).toHaveBeenCalledWith(false);
  });
});

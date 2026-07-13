import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWorkshopLogStore } from "./workshop-log.js";

describe("WorkshopLogStore", () => {
  let store: ReturnType<typeof createWorkshopLogStore>;

  beforeEach(() => {
    store = createWorkshopLogStore({});
  });

  it("starts and ends a log", () => {
    const log = store.startLog("test-tag");
    expect(log.id).toBeDefined();
    expect(log.tag).toBe("test-tag");
    expect(log.startedAt).toBeGreaterThan(0);
    expect(log.entries).toHaveLength(0);

    const active = store.getActiveLog();
    expect(active?.id).toBe(log.id);

    const ended = store.endLog(log.id);
    expect(ended?.endedAt).toBeDefined();
    expect(store.getActiveLog()).toBeUndefined();
  });

  it("adds entries to active log", () => {
    const log = store.startLog();
    const entry = store.addEntry(log.id, "First observation");
    expect(entry).toBeDefined();
    expect(entry?.text).toBe("First observation");
    expect(entry?.relativeTimeMs).toBeGreaterThanOrEqual(0);

    const updated = store.getLog(log.id);
    expect(updated?.entries).toHaveLength(1);
  });

  it("cannot add entries to ended log", () => {
    const log = store.startLog();
    store.endLog(log.id);
    const entry = store.addEntry(log.id, "Too late");
    expect(entry).toBeUndefined();
  });

  it("searches logs by content", () => {
    const log = store.startLog();
    store.addEntry(log.id, "Found the auth bug in login flow");
    store.endLog(log.id);

    const results = store.searchLogs("auth bug");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe(log.id);
  });

  it("gets logs by tag", () => {
    const log1 = store.startLog("folio");
    store.endLog(log1.id);
    const log2 = store.startLog("other");
    store.endLog(log2.id);

    const folioLogs = store.getLogsByTag("folio");
    expect(folioLogs).toHaveLength(1);
    expect(folioLogs[0].tag).toBe("folio");
  });

  it("summarizes log with reasoning", async () => {
    const mockReasoning = { prompt: vi.fn().mockResolvedValue("Test summary of the log") };
    store = createWorkshopLogStore({ reasoning: mockReasoning });

    const log = store.startLog();
    store.addEntry(log.id, "Found the bug");
    store.addEntry(log.id, "Fixed the null check");
    store.endLog(log.id);

    const summary = await store.summarizeLog(log.id);
    expect(summary).toBe("Test summary of the log");
    expect(mockReasoning.prompt).toHaveBeenCalled();
  });
});

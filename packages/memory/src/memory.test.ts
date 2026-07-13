import { describe, it, expect, beforeEach } from "vitest";
import { createMemoryStore } from "../src/memory.js";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { rmSync, existsSync } from "node:fs";

describe("MemoryStore", () => {
  const testDir = join(tmpdir(), `korvid-memory-test-${Date.now()}`);
  let store: ReturnType<typeof createMemoryStore>;

  beforeEach(() => {
    store = createMemoryStore({ dataDir: testDir });
  });

  it("stores and retrieves core memory", () => {
    store.setCore("user.name", "Jason");
    const entry = store.getCore("user.name");
    expect(entry).toBeDefined();
    expect(entry!.value).toBe("Jason");
    expect(entry!.category).toBe("user");
  });

  it("updates existing core memory", () => {
    store.setCore("user.name", "Jason");
    store.setCore("user.name", "Jason A");
    expect(store.getCore("user.name")!.value).toBe("Jason A");
  });

  it("searches core memory", () => {
    store.setCore("user.name", "Jason");
    store.setCore("user.fav_color", "blue");
    const results = store.searchCore("jason");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("adds and retrieves episodic memory", () => {
    const entry = store.addEpisodic("Built the voice pipeline", "Full voice pipeline with STT, reasoning, TTS", ["voice", "build"]);
    expect(entry.id).toBeDefined();
    expect(store.getEpisodic(entry.id)).toBeDefined();
  });

  it("searches episodic memory by content", () => {
    store.addEpisodic("Voice pipeline built", "STT and TTS working", ["voice"]);
    store.addEpisodic("Dashboard created", "React 3D visualization", ["dashboard"]);
    const results = store.searchEpisodic("voice");
    expect(results.length).toBeGreaterThanOrEqual(1);
  });

  it("returns recent episodic entries", () => {
    store.addEpisodic("First", "details", [], 0.1);
    store.addEpisodic("Second", "details", [], 0.9);
    const recent = store.getRecentEpisodic(2);
    expect(recent.length).toBe(2);
  });

  it("generates graph nodes", () => {
    store.setCore("test.key", "test.value");
    store.addEpisodic("Test event", "details", ["test"]);
    const nodes = store.toGraphNodes();
    expect(nodes.length).toBe(3); // fact + episodic + tag node
    expect(nodes.some((n) => n.type === "fact")).toBe(true);
    expect(nodes.some((n) => n.type === "episodic")).toBe(true);
    expect(nodes.some((n) => n.type === "tag")).toBe(true);
  });

  it("consolidates similar episodic memories", () => {
    // Add very similar entries (high word overlap for cosine similarity > 0.6)
    store.addEpisodic("voice pipeline setup", "voice pipeline setup complete", ["voice"]);
    store.addEpisodic("voice pipeline setup testing", "voice pipeline setup testing done", ["voice"]);
    store.addEpisodic("dashboard created", "react visualization", ["dashboard"]);

    const statsBefore = store.getStats();
    const merged = store.consolidateEpisodic();
    const statsAfter = store.getStats();

    // Should have merged the voice-related entries
    expect(merged).toBeGreaterThanOrEqual(1);
    // Episodic count should be reduced
    expect(statsAfter.episodicCount).toBeLessThanOrEqual(statsBefore.episodicCount);
  });

  it("prunes old low-importance episodic memories", () => {
    // Add entries with old timestamps
    const entry1 = store.addEpisodic("Old event", "details", [], 0.1);
    const entry2 = store.addEpisodic("Important event", "details", [], 0.9);

    // Manually set old timestamp (30+ days ago)
    const oldTime = Date.now() - 31 * 24 * 60 * 60 * 1000;
    (entry1 as any).timestamp = oldTime;

    const pruned = store.pruneEpisodic();
    expect(pruned).toBe(1);
    expect(store.getEpisodic(entry1.id)).toBeUndefined();
    expect(store.getEpisodic(entry2.id)).toBeDefined();
  });

  it("returns memory stats", () => {
    store.setCore("key1", "value1");
    store.setCore("key2", "value2");
    store.addEpisodic("Event 1", "details", [], 0.8);
    store.addEpisodic("Event 2", "details", [], 0.6);

    const stats = store.getStats();
    expect(stats.coreCount).toBe(2);
    expect(stats.episodicCount).toBe(2);
    expect(stats.avgEpisodicImportance).toBeCloseTo(0.7, 1);
    expect(stats.edgeCount).toBe(0);
  });

  it("adds and retrieves graph edges", () => {
    const e1 = store.addEpisodic("Event A", "details", ["tag1"]);
    const e2 = store.addEpisodic("Event B", "details", ["tag2"]);

    const edge = store.addEdge(e1.id, e2.id, "related_to", 0.8);
    expect(edge.id).toBeDefined();
    expect(edge.source).toBe(e1.id);
    expect(edge.target).toBe(e2.id);
    expect(edge.weight).toBe(0.8);

    const nodeEdges = store.getEdges(e1.id);
    expect(nodeEdges.length).toBe(1);
    expect(nodeEdges[0].id).toBe(edge.id);
  });

  it("finds neighbors through edges", () => {
    const e1 = store.addEpisodic("A", "d", []);
    const e2 = store.addEpisodic("B", "d", []);
    const e3 = store.addEpisodic("C", "d", []);

    store.addEdge(e1.id, e2.id, "related_to");
    store.addEdge(e2.id, e3.id, "follows");

    const neighbors = store.getNeighbors(e1.id, 2);
    expect(neighbors).toContain(e2.id);
    expect(neighbors).toContain(e3.id);
  });

  it("generates full graph with edges", () => {
    const e1 = store.addEpisodic("Event", "details", ["tag1"]);
    store.setCore("key", "value");
    store.addEdge("key", e1.id, "mentions");

    const graph = store.toGraph();
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.edges.length).toBe(1);
    expect(graph.edges[0].relation).toBe("mentions");
  });

  it("removes edges", () => {
    const e1 = store.addEpisodic("A", "d", []);
    const e2 = store.addEpisodic("B", "d", []);
    const edge = store.addEdge(e1.id, e2.id, "related_to");

    expect(store.removeEdge(edge.id)).toBe(true);
    expect(store.getEdges(e1.id).length).toBe(0);
  });
});

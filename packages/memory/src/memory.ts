import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { MemoryStore, CoreMemoryEntry, EpisodicMemoryEntry, MemoryNode, MemoryEdge, MemoryGraph } from "./types.js";

let idCounter = 0;
function genId(): string {
  return `mem-${Date.now()}-${(idCounter++).toString(36)}`;
}

function cosineSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  const intersection = new Set([...wordsA].filter((w) => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export function createMemoryStore(opts?: { dataDir?: string }): MemoryStore {
  const dataDir = opts?.dataDir ?? join(process.env.HOME ?? "/tmp", ".korvid", "memory");
  const corePath = join(dataDir, "core.json");
  const episodicDir = join(dataDir, "episodic");
  const edgesPath = join(dataDir, "edges.json");

  const core = new Map<string, CoreMemoryEntry>();
  const episodic = new Map<string, EpisodicMemoryEntry>();
  const edges = new Map<string, MemoryEdge>();

  function ensureDirs() {
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    if (!existsSync(episodicDir)) mkdirSync(episodicDir, { recursive: true });
  }

  return {
    setCore(key: string, value: string, category: CoreMemoryEntry["category"] = "user"): CoreMemoryEntry {
      const existing = core.get(key);
      const entry: CoreMemoryEntry = existing
        ? { ...existing, value, category, updatedAt: Date.now() }
        : { id: genId(), key, value, category, createdAt: Date.now(), updatedAt: Date.now(), accessCount: 0 };
      core.set(key, entry);
      return entry;
    },

    getCore(key: string): CoreMemoryEntry | undefined {
      const entry = core.get(key);
      if (entry) entry.accessCount++;
      return entry;
    },

    getAllCore(): CoreMemoryEntry[] {
      return Array.from(core.values());
    },

    deleteCore(key: string): boolean {
      return core.delete(key);
    },

    searchCore(query: string): CoreMemoryEntry[] {
      const q = query.toLowerCase();
      return Array.from(core.values())
        .filter((e) => e.key.toLowerCase().includes(q) || e.value.toLowerCase().includes(q))
        .sort((a, b) => cosineSimilarity(query, b.value) - cosineSimilarity(query, a.value) || b.accessCount - a.accessCount);
    },

    addEpisodic(summary: string, details: string, tags: string[] = [], importance: number = 0.5): EpisodicMemoryEntry {
      const entry: EpisodicMemoryEntry = {
        id: genId(),
        summary,
        details,
        tags,
        timestamp: Date.now(),
        importance,
        accessCount: 0,
        lastAccessed: Date.now(),
      };
      episodic.set(entry.id, entry);
      return entry;
    },

    getEpisodic(id: string): EpisodicMemoryEntry | undefined {
      const entry = episodic.get(id);
      if (entry) {
        entry.accessCount++;
        entry.lastAccessed = Date.now();
      }
      return entry;
    },

    searchEpisodic(query: string, limit = 10): EpisodicMemoryEntry[] {
      return Array.from(episodic.values())
        .map((e) => ({ entry: e, score: cosineSimilarity(query, e.summary + " " + e.details) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score || b.entry.importance - a.entry.importance)
        .slice(0, limit)
        .map((s) => s.entry);
    },

    getRecentEpisodic(limit = 20): EpisodicMemoryEntry[] {
      return Array.from(episodic.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);
    },

    pruneEpisodic(maxAgeMs = 30 * 24 * 60 * 60 * 1000): number {
      const cutoff = Date.now() - maxAgeMs;
      let pruned = 0;
      for (const [id, entry] of episodic) {
        if (entry.timestamp < cutoff && entry.importance < 0.3) {
          episodic.delete(id);
          pruned++;
        }
      }
      return pruned;
    },

    consolidateEpisodic(): number {
      const entries = Array.from(episodic.values()).sort((a, b) => b.timestamp - a.timestamp);
      const merged: EpisodicMemoryEntry[] = [];
      let mergedCount = 0;

      for (const entry of entries) {
        // Skip if already merged
        if (merged.some((m) => m.id === entry.id)) continue;

        // Find similar entries to merge
        const similar = entries.filter(
          (e) =>
            e.id !== entry.id &&
            !merged.some((m) => m.id === e.id) &&
            cosineSimilarity(entry.summary, e.summary) > 0.6 &&
            Math.abs(e.timestamp - entry.timestamp) < 7 * 24 * 60 * 60 * 1000 // within 7 days
        );

        if (similar.length > 0) {
          // Merge: combine summaries, take highest importance, union tags
          const allSummaries = [entry.summary, ...similar.map((s) => s.summary)];
          const allDetails = [entry.summary + ": " + entry.details, ...similar.map((s) => s.summary + ": " + s.details)];
          const allTags = [...new Set([...entry.tags, ...similar.map((s) => s.tags).flat()])];
          const maxImportance = Math.max(entry.importance, ...similar.map((s) => s.importance));

          const consolidated: EpisodicMemoryEntry = {
            id: entry.id,
            summary: allSummaries.slice(0, 3).join("; "),
            details: allDetails.join("\n"),
            tags: allTags,
            timestamp: entry.timestamp,
            importance: Math.min(maxImportance + 0.1, 1),
            accessCount: entry.accessCount + similar.reduce((s, e) => s + e.accessCount, 0),
            lastAccessed: Math.max(entry.lastAccessed, ...similar.map((s) => s.lastAccessed)),
          };

          merged.push(consolidated);

          // Remove the entries that were merged
          for (const s of similar) {
            episodic.delete(s.id);
            mergedCount++;
          }

          // Replace original with consolidated
          episodic.set(entry.id, consolidated);
          mergedCount++;
        }
      }

      // Also prune old low-importance entries
      this.pruneEpisodic(30 * 24 * 60 * 60 * 1000);

      return mergedCount;
    },

    // ── Graph Edges ──────────────────────────────────────────────

    addEdge(source: string, target: string, relation: MemoryEdge["relation"], weight = 0.5): MemoryEdge {
      // Check if edge already exists
      for (const edge of edges.values()) {
        if (edge.source === source && edge.target === target && edge.relation === relation) {
          edge.weight = Math.max(edge.weight, weight);
          return edge;
        }
      }

      const edge: MemoryEdge = {
        id: genId(),
        source,
        target,
        relation,
        weight,
        createdAt: Date.now(),
      };
      edges.set(edge.id, edge);
      return edge;
    },

    getEdges(nodeId: string): MemoryEdge[] {
      return Array.from(edges.values()).filter(
        (e) => e.source === nodeId || e.target === nodeId
      );
    },

    getNeighbors(nodeId: string, maxDepth = 2): string[] {
      const visited = new Set<string>();
      const result: string[] = [];

      function traverse(id: string, depth: number) {
        if (depth > maxDepth || visited.has(id)) return;
        visited.add(id);

        for (const edge of edges.values()) {
          if (edge.source === id && !visited.has(edge.target)) {
            result.push(edge.target);
            traverse(edge.target, depth + 1);
          } else if (edge.target === id && !visited.has(edge.source)) {
            result.push(edge.source);
            traverse(edge.source, depth + 1);
          }
        }
      }

      traverse(nodeId, 0);
      return result;
    },

    removeEdge(edgeId: string): boolean {
      return edges.delete(edgeId);
    },

    // ── Stats ────────────────────────────────────────────────────

    getStats(): { coreCount: number; episodicCount: number; totalEpisodicAccess: number; avgEpisodicImportance: number; edgeCount: number } {
      const episodicEntries = Array.from(episodic.values());
      return {
        coreCount: core.size,
        episodicCount: episodic.size,
        totalEpisodicAccess: episodicEntries.reduce((s, e) => s + e.accessCount, 0),
        avgEpisodicImportance: episodicEntries.length > 0
          ? episodicEntries.reduce((s, e) => s + e.importance, 0) / episodicEntries.length
          : 0,
        edgeCount: edges.size,
      };
    },

    toGraphNodes(): MemoryNode[] {
      const nodes: MemoryNode[] = [];
      const coreEntries = Array.from(core.values()).slice(0, 20);
      const episodicEntries = Array.from(episodic.values())
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 20);

      // Collect all tags for tag nodes
      const allTags = new Set<string>();
      for (const entry of episodicEntries) {
        for (const tag of entry.tags) allTags.add(tag);
      }

      for (const entry of coreEntries) {
        const nodeEdges = this.getEdges(entry.id);
        nodes.push({
          id: entry.id,
          label: entry.key,
          type: "fact",
          connections: nodeEdges.map((e) => e.source === entry.id ? e.target : e.source),
          active: Date.now() - entry.updatedAt < 60000,
          lastAccessed: entry.updatedAt,
          x: Math.cos(nodes.length * 0.5) * 3,
          y: Math.sin(nodes.length * 0.5) * 3,
          z: -1,
        });
      }

      for (const entry of episodicEntries) {
        const nodeEdges = this.getEdges(entry.id);
        const tagConnections = entry.tags.map((t) => `tag-${t}`);
        nodes.push({
          id: entry.id,
          label: entry.summary.slice(0, 30),
          type: "episodic",
          connections: [...new Set([...nodeEdges.map((e) => e.source === entry.id ? e.target : e.source), ...tagConnections])],
          active: Date.now() - entry.lastAccessed < 60000,
          lastAccessed: entry.lastAccessed,
          x: Math.cos(nodes.length * 0.5) * 4,
          y: Math.sin(nodes.length * 0.5) * 4,
          z: -2,
        });
      }

      // Add tag nodes
      for (const tag of allTags) {
        nodes.push({
          id: `tag-${tag}`,
          label: tag,
          type: "tag",
          connections: episodicEntries
            .filter((e) => e.tags.includes(tag))
            .map((e) => e.id),
          active: false,
          lastAccessed: 0,
          x: Math.cos(nodes.length * 0.5) * 5,
          y: Math.sin(nodes.length * 0.5) * 5,
          z: -3,
        });
      }

      return nodes;
    },

    toGraph(): MemoryGraph {
      return {
        nodes: this.toGraphNodes(),
        edges: Array.from(edges.values()),
      };
    },

    async save() {
      ensureDirs();
      writeFileSync(corePath, JSON.stringify(Array.from(core.values()), null, 2));
      writeFileSync(edgesPath, JSON.stringify(Array.from(edges.values()), null, 2));

      for (const [id, entry] of episodic) {
        writeFileSync(join(episodicDir, `${id}.json`), JSON.stringify(entry, null, 2));
      }
    },

    async load() {
      ensureDirs();

      // Load core
      if (existsSync(corePath)) {
        try {
          const data = JSON.parse(readFileSync(corePath, "utf-8")) as CoreMemoryEntry[];
          for (const entry of data) core.set(entry.key, entry);
        } catch { /* ignore corrupt file */ }
      }

      // Load episodic
      if (existsSync(episodicDir)) {
        for (const file of readdirSync(episodicDir)) {
          if (!file.endsWith(".json")) continue;
          try {
            const entry = JSON.parse(readFileSync(join(episodicDir, file), "utf-8")) as EpisodicMemoryEntry;
            episodic.set(entry.id, entry);
          } catch { /* ignore corrupt file */ }
        }
      }

      // Load edges
      if (existsSync(edgesPath)) {
        try {
          const data = JSON.parse(readFileSync(edgesPath, "utf-8")) as MemoryEdge[];
          for (const edge of data) edges.set(edge.id, edge);
        } catch { /* ignore corrupt file */ }
      }
    },
  };
}

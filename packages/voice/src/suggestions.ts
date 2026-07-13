import { EventEmitter } from "node:events";
import type { MemoryStore, EpisodicMemoryEntry, CoreMemoryEntry } from "@korvid/memory";

export interface Suggestion {
  id: string;
  type: "reminder" | "follow_up" | "context" | "proactive";
  message: string;
  context?: string;
  priority: number; // 0-1
  createdAt: number;
  source: string;
}

export interface SuggestionEngine {
  start(): void;
  stop(): void;
  check(): Promise<Suggestion[]>;
  dismiss(id: string): void;
  onSuggestion(cb: (suggestion: Suggestion) => void): void;
}

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_SUGGESTIONS = 5;

export function createSuggestionEngine(deps: {
  memory: MemoryStore;
  reasoning?: { prompt: (text: string) => Promise<string> };
}): SuggestionEngine {
  const emitter = new EventEmitter();
  const suggestions = new Map<string, Suggestion>();
  let interval: ReturnType<typeof setInterval> | null = null;

  function genId(): string {
    return `sug-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }

  async function analyzeRecentContext(): Promise<Suggestion[]> {
    const results: Suggestion[] = [];
    const recentEpisodic = deps.memory.getRecentEpisodic(10);
    const coreEntries = deps.memory.getAllCore();

    // Check for follow-up opportunities
    for (const entry of recentEpisodic) {
      const age = Date.now() - entry.timestamp;
      const hoursSince = age / (1000 * 60 * 60);

      // Suggest follow-up if important event happened 1-24 hours ago
      if (entry.importance > 0.6 && hoursSince > 1 && hoursSince < 24) {
        results.push({
          id: genId(),
          type: "follow_up",
          message: `Follow up on: ${entry.summary}`,
          context: entry.details.slice(0, 100),
          priority: entry.importance * 0.8,
          createdAt: Date.now(),
          source: entry.id,
        });
      }

      // Check for patterns — multiple related events
      const relatedCount = recentEpisodic.filter(
        (e: { id: string; tags: string[]; timestamp: number }) =>
          e.id !== entry.id &&
          e.tags.some((t: string) => entry.tags.includes(t)) &&
          Math.abs(e.timestamp - entry.timestamp) < 24 * 60 * 60 * 1000
      ).length;

      if (relatedCount >= 2) {
        results.push({
          id: genId(),
          type: "context",
          message: `Trending topic: ${entry.tags[0] ?? "general"} (${relatedCount + 1} related events today)`,
        context: recentEpisodic
          .filter((e: { tags: string[] }) => e.tags.some((t: string) => entry.tags.includes(t)))
            .map((e) => e.summary)
            .join("; ")
            .slice(0, 150),
          priority: 0.6,
          createdAt: Date.now(),
          source: entry.tags[0] ?? "general",
        });
      }
    }

    // Check core memory for proactive suggestions
    const userPrefs = coreEntries.filter((e: { category: string }) => e.category === "preference");
    if (userPrefs.length > 0) {
      const prefSummary = userPrefs.map((p: { key: string; value: string }) => `${p.key}: ${p.value}`).join(", ");
      results.push({
        id: genId(),
        type: "proactive",
        message: `Based on your preferences: ${prefSummary.slice(0, 80)}`,
        context: prefSummary,
        priority: 0.3,
        createdAt: Date.now(),
        source: "preferences",
      });
    }

    // If we have reasoning, use it for deeper analysis
    if (deps.reasoning && recentEpisodic.length >= 3) {
      try {
        const contextText = recentEpisodic.map((e) => `- ${e.summary} (${e.tags.join(", ")})`).join("\n");
        const prompt = `Given these recent events:\n${contextText}\n\nSuggest one actionable follow-up or reminder. Be specific and concise. If nothing comes to mind, say "none".`;
        const response = await deps.reasoning.prompt(prompt);

        if (response.toLowerCase() !== "none" && response.length > 10) {
          results.push({
            id: genId(),
            type: "proactive",
            message: response.slice(0, 200),
            priority: 0.7,
            createdAt: Date.now(),
            source: "reasoning",
          });
        }
      } catch {
        // Reasoning failed, continue with heuristic suggestions
      }
    }

    return results
      .sort((a, b) => b.priority - a.priority)
      .slice(0, MAX_SUGGESTIONS);
  }

  return {
    start() {
      interval = setInterval(async () => {
        try {
          const newSuggestions = await analyzeRecentContext();
          for (const sug of newSuggestions) {
            if (!suggestions.has(sug.id)) {
              suggestions.set(sug.id, sug);
              emitter.emit("suggestion", sug);
            }
          }
        } catch (err) {
          console.error(`[suggestions] Error: ${err}`);
        }
      }, CHECK_INTERVAL_MS);
      console.log("[suggestions] Engine started, checking every 5 minutes");
    },

    stop() {
      if (interval) clearInterval(interval);
      interval = null;
      console.log("[suggestions] Engine stopped");
    },

    async check(): Promise<Suggestion[]> {
      const results = await analyzeRecentContext();
      for (const sug of results) {
        suggestions.set(sug.id, sug);
      }
      return results;
    },

    dismiss(id: string) {
      suggestions.delete(id);
    },

    onSuggestion(cb: (suggestion: Suggestion) => void) {
      emitter.on("suggestion", cb);
    },
  };
}

export interface DebriefItem {
  id: string;
  type: "task_completed" | "held_item" | "reminder" | "error" | "status";
  message: string;
  outcome?: "success" | "failure" | "partial";
  priority: number;
  timestamp: number;
  details?: string;
}

export interface DebriefMode {
  recordTaskCompletion(taskId: string, description: string, outcome: "success" | "failure" | "partial", details?: string): void;
  recordEvent(type: DebriefItem["type"], message: string, priority?: number, details?: string): void;
  getItemsSince(sinceMs: number): DebriefItem[];
  getHeldItems(): DebriefItem[];
  clearHeldItems(): void;
  generateDebrief(idleSinceMs: number): Promise<string>;
}

export function createDebriefMode(deps: {
  reasoning?: { prompt: (text: string) => Promise<string> };
}): DebriefMode {
  const items: DebriefItem[] = [];
  let idCounter = 0;

  function genId(): string {
    return `debrief-${Date.now()}-${(idCounter++).toString(36)}`;
  }

  function recordTaskCompletion(
    taskId: string,
    description: string,
    outcome: "success" | "failure" | "partial",
    details?: string
  ) {
    items.push({
      id: genId(),
      type: "task_completed",
      message: `${description}: ${outcome}`,
      outcome,
      priority: outcome === "failure" ? 0.9 : 0.5,
      timestamp: Date.now(),
      details,
    });
  }

  function recordEvent(
    type: DebriefItem["type"],
    message: string,
    priority = 0.5,
    details?: string
  ) {
    items.push({
      id: genId(),
      type,
      message,
      priority,
      timestamp: Date.now(),
      details,
    });
  }

  function getItemsSince(sinceMs: number): DebriefItem[] {
    return items.filter((item) => item.timestamp >= sinceMs);
  }

  function getHeldItems(): DebriefItem[] {
    return items.filter((item) => item.type === "held_item" || item.type === "reminder");
  }

  function clearHeldItems() {
    const heldTypes = new Set(["held_item", "reminder"]);
    for (let i = items.length - 1; i >= 0; i--) {
      if (heldTypes.has(items[i].type)) {
        items.splice(i, 1);
      }
    }
  }

  async function generateDebrief(idleSinceMs: number): Promise<string> {
    const recentItems = getItemsSince(idleSinceMs);
    if (recentItems.length === 0) {
      return "Nothing new since you were away.";
    }

    // Sort by priority (highest first) then timestamp
    const sorted = [...recentItems].sort((a, b) => {
      if (Math.abs(b.priority - a.priority) > 0.1) return b.priority - a.priority;
      return a.timestamp - b.timestamp;
    });

    const summary = sorted
      .map((item) => {
        const icon = item.type === "task_completed"
          ? item.outcome === "success" ? "[OK]" : item.outcome === "failure" ? "[FAIL]" : "[PARTIAL]"
          : item.type === "held_item" ? "[HELD]"
          : item.type === "error" ? "[ERR]"
          : "[INFO]";
        return `${icon} ${item.message}`;
      })
      .join("\n");

    if (deps.reasoning && sorted.length > 3) {
      const prompt = [
        "Generate a brief spoken debrief summary from these events.",
        "Keep it concise — 2-3 sentences max.",
        "Focus on what needs the user's attention first.",
        "",
        summary,
      ].join("\n");

      return await deps.reasoning.prompt(prompt);
    }

    return summary;
  }

  return {
    recordTaskCompletion,
    recordEvent,
    getItemsSince,
    getHeldItems,
    clearHeldItems,
    generateDebrief,
  };
}

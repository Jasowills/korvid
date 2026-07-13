export interface LogEntry {
  id: string;
  logId: string;
  text: string;
  timestamp: number;
  relativeTimeMs: number;
  tag?: string;
}

export interface WorkshopLog {
  id: string;
  tag?: string;
  startedAt: number;
  endedAt?: number;
  entries: LogEntry[];
  summary?: string;
}

export interface WorkshopLogStore {
  startLog(tag?: string): WorkshopLog;
  endLog(logId: string): WorkshopLog | undefined;
  addEntry(logId: string, text: string): LogEntry | undefined;
  getLog(logId: string): WorkshopLog | undefined;
  getActiveLog(): WorkshopLog | undefined;
  getLogsByTag(tag: string): WorkshopLog[];
  getRecentLogs(limit?: number): WorkshopLog[];
  summarizeLog(logId: string): Promise<string>;
  searchLogs(query: string, limit?: number): WorkshopLog[];
}

function genId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function createWorkshopLogStore(deps: {
  reasoning?: { prompt: (text: string) => Promise<string> };
}): WorkshopLogStore {
  const logs = new Map<string, WorkshopLog>();
  let activeLogId: string | null = null;

  function startLog(tag?: string): WorkshopLog {
    if (activeLogId) {
      const active = logs.get(activeLogId);
      if (active) {
        active.endedAt = Date.now();
      }
    }

    const log: WorkshopLog = {
      id: genId("log"),
      tag,
      startedAt: Date.now(),
      entries: [],
    };

    logs.set(log.id, log);
    activeLogId = log.id;
    return log;
  }

  function endLog(logId: string): WorkshopLog | undefined {
    const log = logs.get(logId);
    if (!log) return undefined;

    log.endedAt = Date.now();
    if (activeLogId === logId) {
      activeLogId = null;
    }

    return log;
  }

  function addEntry(logId: string, text: string): LogEntry | undefined {
    const log = logs.get(logId);
    if (!log || log.endedAt) return undefined;

    const entry: LogEntry = {
      id: genId("entry"),
      logId,
      text,
      timestamp: Date.now(),
      relativeTimeMs: Date.now() - log.startedAt,
      tag: log.tag,
    };

    log.entries.push(entry);
    return entry;
  }

  function getLog(logId: string): WorkshopLog | undefined {
    return logs.get(logId);
  }

  function getActiveLog(): WorkshopLog | undefined {
    if (!activeLogId) return undefined;
    return logs.get(activeLogId);
  }

  function getLogsByTag(tag: string): WorkshopLog[] {
    return Array.from(logs.values()).filter((l) => l.tag === tag);
  }

  function getRecentLogs(limit = 10): WorkshopLog[] {
    return Array.from(logs.values())
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
  }

  async function summarizeLog(logId: string): Promise<string> {
    const log = logs.get(logId);
    if (!log) return "Log not found.";

    const transcript = log.entries
      .map((e) => {
        const mins = Math.floor(e.relativeTimeMs / 60000);
        const secs = Math.floor((e.relativeTimeMs % 60000) / 1000);
        const timeStr = `${mins}:${secs.toString().padStart(2, "0")}`;
        return `[${timeStr}] ${e.text}`;
      })
      .join("\n");

    if (deps.reasoning) {
      const prompt = [
        "Summarize the following workshop log transcript into a concise recap.",
        "Focus on key points, decisions, observations, and action items.",
        "Be concise — this is a stream-of-consciousness log, not a conversation.",
        "",
        transcript,
      ].join("\n");

      const result = await deps.reasoning.prompt(prompt);
      log.summary = result;
      return result;
    }

    // Fallback: return raw transcript as summary
    log.summary = transcript;
    return transcript;
  }

  function searchLogs(query: string, limit = 5): WorkshopLog[] {
    const queryWords = new Set(query.toLowerCase().split(/\s+/));

    return Array.from(logs.values())
      .map((log) => {
        const logText = log.entries.map((e) => e.text).join(" ").toLowerCase();
        const logWords = new Set(logText.split(/\s+/));
        const intersection = new Set([...queryWords].filter((w) => logWords.has(w)));
        const score = intersection.size / queryWords.size;
        return { log, score };
      })
      .filter(({ score }) => score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ log }) => log);
  }

  return {
    startLog,
    endLog,
    addEntry,
    getLog,
    getActiveLog,
    getLogsByTag,
    getRecentLogs,
    summarizeLog,
    searchLogs,
  };
}

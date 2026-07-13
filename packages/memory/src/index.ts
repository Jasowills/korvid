export const MEMORY_VERSION = "0.2.0";

export { type MemoryStore, type CoreMemoryEntry, type EpisodicMemoryEntry, type MemoryNode, type MemoryEdge, type MemoryGraph } from "./types.js";
export { createMemoryStore } from "./memory.js";

import type { KorvidConfig } from "@korvid/shared";
import { createMemoryStore } from "./memory.js";
import type { MemoryStore } from "./types.js";

export function createDefaultMemory(config: KorvidConfig): MemoryStore {
  return createMemoryStore({ dataDir: config.memory.coreMemoryPath });
}

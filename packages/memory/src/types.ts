export interface CoreMemoryEntry {
  id: string;
  key: string;
  value: string;
  category: "user" | "system" | "preference" | "fact";
  createdAt: number;
  updatedAt: number;
  accessCount: number;
}

export interface EpisodicMemoryEntry {
  id: string;
  summary: string;
  details: string;
  tags: string[];
  timestamp: number;
  importance: number; // 0-1
  accessCount: number;
  lastAccessed: number;
}

export interface MemoryEdge {
  id: string;
  source: string;
  target: string;
  relation: "related_to" | "part_of" | "caused_by" | "follows" | "mentions" | "tagged_with";
  weight: number; // 0-1
  createdAt: number;
}

export interface MemoryNode {
  id: string;
  label: string;
  type: "fact" | "episodic" | "project" | "tool" | "tag";
  connections: string[];
  active: boolean;
  lastAccessed: number;
  x: number;
  y: number;
  z: number;
}

export interface MemoryGraph {
  nodes: MemoryNode[];
  edges: MemoryEdge[];
}

export interface MemoryStore {
  // Core memory (facts about user, preferences, key info)
  setCore(key: string, value: string, category?: CoreMemoryEntry["category"]): CoreMemoryEntry;
  getCore(key: string): CoreMemoryEntry | undefined;
  getAllCore(): CoreMemoryEntry[];
  deleteCore(key: string): boolean;
  searchCore(query: string): CoreMemoryEntry[];

  // Episodic memory (conversation history, events)
  addEpisodic(summary: string, details: string, tags?: string[], importance?: number): EpisodicMemoryEntry;
  getEpisodic(id: string): EpisodicMemoryEntry | undefined;
  searchEpisodic(query: string, limit?: number): EpisodicMemoryEntry[];
  getRecentEpisodic(limit?: number): EpisodicMemoryEntry[];
  pruneEpisodic(maxAge?: number): number;
  consolidateEpisodic(): number;

  // Graph edges
  addEdge(source: string, target: string, relation: MemoryEdge["relation"], weight?: number): MemoryEdge;
  getEdges(nodeId: string): MemoryEdge[];
  getNeighbors(nodeId: string, maxDepth?: number): string[];
  removeEdge(edgeId: string): boolean;

  // Stats
  getStats(): { coreCount: number; episodicCount: number; totalEpisodicAccess: number; avgEpisodicImportance: number; edgeCount: number };

  // Visualization
  toGraphNodes(): MemoryNode[];
  toGraph(): MemoryGraph;

  // Persistence
  save(): Promise<void>;
  load(): Promise<void>;
}

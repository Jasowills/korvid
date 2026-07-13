export interface GatewayState {
  connected: boolean;
  uptime: number;
  pipelineState: "idle" | "listening" | "processing" | "speaking";
  activeNodes: string[];
  memoryNodes: MemoryNode[];
  activityLog: ActivityEntry[];
  cost: CostInfo;
  tools: ToolCall[];
  delegationEvents: DelegationEvent[];
  partialTranscript?: string;
  streamingText?: string;
  streamingDone?: boolean;
  toolPermissions: ToolPermissions;
  memoryStats: MemoryStats;
}

export interface MemoryNode {
  id: string;
  label: string;
  type: "fact" | "episodic" | "project" | "tool" | "tag";
  x: number;
  y: number;
  z: number;
  connections: string[];
  active: boolean;
  lastAccessed: number;
}

export interface ActivityEntry {
  id: string;
  timestamp: number;
  type: "reasoning" | "tool" | "stt" | "tts" | "error" | "interrupt" | "delegation";
  message: string;
  status: "running" | "completed" | "failed" | "interrupted";
}

export interface DelegationEvent {
  id: string;
  timestamp: number;
  type: string;
  agent: string;
  status: "running" | "completed" | "failed";
  request: string;
}

export interface CostInfo {
  totalTokens: number;
  totalCostUsd: number;
  budgetCapUsd: number;
  budgetUsedPercent: number;
  byTask: { name: string; tokens: number; costUsd: number }[];
  byTool: Record<string, { calls: number; totalMs: number; errors: number }>;
}

export interface ToolPermissions {
  enabled: boolean;
  allow: string[];
  deny: string[];
  requireConfirmation: string[];
}

export interface MemoryStats {
  coreCount: number;
  episodicCount: number;
  totalEpisodicAccess: number;
  avgEpisodicImportance: number;
  edgeCount: number;
}

export interface Suggestion {
  id: string;
  type: "reminder" | "follow_up" | "context" | "proactive";
  message: string;
  context?: string;
  priority: number;
  createdAt: number;
  source: string;
}

export interface ToolCall {
  id: string;
  name: string;
  status: "running" | "completed" | "failed";
  startTime: number;
  endTime?: number;
  durationMs?: number;
}

export const EMPTY_STATE: GatewayState = {
  connected: false,
  uptime: 0,
  pipelineState: "idle",
  activeNodes: [],
  memoryNodes: [],
  activityLog: [],
  cost: { totalTokens: 0, totalCostUsd: 0, budgetCapUsd: 50, budgetUsedPercent: 0, byTask: [], byTool: {} },
  tools: [],
  delegationEvents: [],
  toolPermissions: { enabled: true, allow: [], deny: [], requireConfirmation: [] },
  memoryStats: { coreCount: 0, episodicCount: 0, totalEpisodicAccess: 0, avgEpisodicImportance: 0, edgeCount: 0 },
};

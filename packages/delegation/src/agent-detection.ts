import { execFileSync } from "node:child_process";

export type AgentId = "opencode" | "claude" | "unknown";

export interface AgentInfo {
  id: AgentId;
  name: string;
  available: boolean;
  version?: string;
  path?: string;
}

const AGENT_PROBES: { id: AgentId; name: string; command: string; versionFlag: string }[] = [
  { id: "opencode", name: "OpenCode", command: "opencode", versionFlag: "--version" },
  { id: "claude", name: "Claude Code", command: "claude", versionFlag: "--version" },
];

function findBinary(name: string): string | null {
  try {
    const cmd = process.platform === "win32" ? "where" : "which";
    return execFileSync(cmd, [name], { timeout: 3000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

export function detectAgents(): AgentInfo[] {
  return AGENT_PROBES.map((probe) => {
    try {
      const output = execFileSync(probe.command, [probe.versionFlag], {
        timeout: 5000,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();

      const versionMatch = output.match(/(\d+\.\d+\.\d+)/);
      const whichPath = findBinary(probe.command);

      return {
        id: probe.id,
        name: probe.name,
        available: true,
        version: versionMatch?.[1] ?? output.split("\n")[0],
        path: whichPath ?? undefined,
      };
    } catch {
      return {
        id: probe.id,
        name: probe.name,
        available: false,
      };
    }
  });
}

export function getPreferredAgent(preferred?: string): AgentInfo | null {
  const agents = detectAgents();
  const available = agents.filter((a) => a.available);

  if (available.length === 0) return null;

  if (preferred) {
    const match = available.find((a) => a.id === preferred || a.name.toLowerCase().includes(preferred.toLowerCase()));
    if (match) return match;
  }

  // Default priority: opencode > claude
  return available[0];
}

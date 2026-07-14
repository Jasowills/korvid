import { Command } from "commander";
import * as p from "@clack/prompts";
import { execFileSync } from "node:child_process";
import { loadConfig } from "@korvid/shared/config-file.js";

interface CheckResult {
  name: string;
  installed: boolean;
  version?: string;
  purpose: string;
  installCmd?: string;
}

function checkCmd(name: string, cmd: string, args: string[], purpose: string, installCmd?: string): CheckResult {
  try {
    const version = execFileSync(cmd, args, { timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim().split("\n")[0];
    return { name, installed: true, version, purpose, installCmd };
  } catch {
    return { name, installed: false, purpose, installCmd };
  }
}

function platformHint(tool: string, brewPkg?: string): string | undefined {
  const pl = process.platform;
  if (pl === "darwin") return `brew install ${brewPkg ?? tool}`;
  if (pl === "win32") return `choco install ${brewPkg ?? tool}`;
  return `apt install ${brewPkg ?? tool}`;
}

function checkDocker(): CheckResult {
  try {
    execFileSync("docker", ["info"], { timeout: 5000, stdio: "pipe" });
    return { name: "Docker", installed: true, version: "running", purpose: "sandboxed delegation" };
  } catch {
    return { name: "Docker", installed: false, purpose: "sandboxed delegation (git worktree fallback)", installCmd: "https://docs.docker.com/get-docker/" };
  }
}

function formatCheck(r: CheckResult): string {
  const icon = r.installed ? "\x1b[38;2;124;140;255m●\x1b[0m" : "\x1b[38;2;255;107;74m✕\x1b[0m";
  const ver = r.version ? ` \x1b[2m${r.version}\x1b[0m` : "";
  const purpose = ` \x1b[2m${r.purpose}\x1b[0m`;
  const hint = !r.installed && r.installCmd ? `\n    \x1b[2m${r.installCmd}\x1b[0m` : "";
  return `  ${icon} ${r.name}${ver}${purpose}${hint}`;
}

export const doctorCommand = new Command("doctor")
  .description("Check system dependencies and configuration")
  .action(async () => {
    p.intro("Korvid Doctor");

    const systemChecks: CheckResult[] = [
      checkCmd("Node.js", "node", ["--version"], "runtime", "https://nodejs.org"),
      checkCmd("pnpm", "pnpm", ["--version"], "package manager", "npm install -g pnpm"),
      checkCmd("Ollama", "ollama", ["--version"], "local llm", "https://ollama.com"),
      checkCmd("sox", "sox", ["--version"], "microphone", platformHint("sox")),
      checkCmd("imagesnap", "imagesnap", ["-h"], "webcam (macos)", platformHint("imagesnap")),
      checkCmd("ffmpeg", "ffmpeg", ["-version"], "audio processing", platformHint("ffmpeg")),
      checkCmd("ffplay", "ffplay", ["-version"], "audio playback", platformHint("ffmpeg")),
      checkDocker(),
    ];

    let allGood = true;
    const results: string[] = [];

    for (const check of systemChecks) {
      const s = p.spinner();
      s.start(`Checking ${check.name}`);
      await new Promise((r) => setTimeout(r, 120));
      results.push(formatCheck(check));
      if (check.installed) {
        s.stop(`${check.name} found`);
      } else {
        s.stop(`${check.name} missing`);
      }
      if (!check.installed) allGood = false;
    }

    // Configuration section
    const configLines: string[] = [];
    try {
      const config = loadConfig();
      configLines.push("  \x1b[38;2;124;140;255m●\x1b[0m config loaded");
      configLines.push(`    \x1b[2mreasoning: ${config.models.reasoning.provider}/${config.models.reasoning.model}\x1b[0m`);
      configLines.push(`    \x1b[2mstt: ${config.voice.stt.provider}\x1b[0m`);
      configLines.push(`    \x1b[2mtts: ${config.voice.tts.provider}\x1b[0m`);

      if (config.models.reasoning.provider === "ollama") {
        try {
          const res = execFileSync("ollama", ["list"], { timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
          const models = res.trim().split("\n").slice(1).map((l) => l.split(/\s+/)[0]);
          if (models.length === 0) {
            configLines.push("  \x1b[38;2;255;107;74m✕\x1b[0m no ollama models");
            configLines.push("    \x1b[2mrun: ollama pull llama3.2:1b\x1b[0m");
            allGood = false;
          } else if (!models.some((m) => m.includes("llama3.2"))) {
            configLines.push("  \x1b[38;2;255;107;74m✕\x1b[0m llama3.2 not found");
            configLines.push(`    \x1b[2mavailable: ${models.join(", ")}\x1b[0m`);
            allGood = false;
          } else {
            configLines.push("  \x1b[38;2;124;140;255m●\x1b[0m ollama model available");
          }
        } catch {
          configLines.push("  \x1b[38;2;255;107;74m✕\x1b[0m cannot reach ollama");
          allGood = false;
        }
      }
    } catch {
      configLines.push("  \x1b[38;2;255;107;74m✕\x1b[0m no config");
      configLines.push("    \x1b[2mrun: korvid init\x1b[0m");
      allGood = false;
    }

    p.note(results.join("\n") || "(no system checks)", "System Dependencies");
    p.note(configLines.join("\n"), "Configuration");

    if (allGood) {
      p.outro("All dependencies installed.");
    } else {
      p.outro("Some dependencies missing — reduced functionality.");
    }
  });

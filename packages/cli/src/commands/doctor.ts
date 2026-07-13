import { Command } from "commander";
import chalk from "chalk";
import { execFileSync } from "node:child_process";
import { loadConfig } from "@korvid/shared/config-file.js";
import { STATUS_GLYPH } from "../brand.js";

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

function checkDocker(): CheckResult {
  try {
    execFileSync("docker", ["info"], { timeout: 5000, stdio: "pipe" });
    return { name: "Docker", installed: true, version: "running", purpose: "sandboxed delegation" };
  } catch {
    return { name: "Docker", installed: false, purpose: "sandboxed delegation (git worktree fallback)", installCmd: "https://docs.docker.com/get-docker/" };
  }
}

export const doctorCommand = new Command("doctor")
  .description("Check system dependencies and configuration")
  .action(async () => {
    console.log(chalk.dim("\n  system diagnostics\n"));

    const checks: CheckResult[] = [
      checkCmd("Node.js", "node", ["--version"], "runtime", "https://nodejs.org"),
      checkCmd("pnpm", "pnpm", ["--version"], "package manager", "npm install -g pnpm"),
      checkCmd("Ollama", "ollama", ["--version"], "local llm", "https://ollama.com"),
      checkCmd("sox", "sox", ["--version"], "microphone", "brew install sox"),
      checkCmd("imagesnap", "imagesnap", ["-h"], "webcam (macos)", "brew install imagesnap"),
      checkCmd("ffmpeg", "ffmpeg", ["-version"], "audio processing", "brew install ffmpeg"),
      checkCmd("ffplay", "ffplay", ["-version"], "audio playback", "brew install ffmpeg"),
      checkDocker(),
    ];

    let allGood = true;

    for (const check of checks) {
      const icon = check.installed ? chalk.hex("#7C8CFF")(STATUS_GLYPH.active) : chalk.hex("#FF6B4A")(STATUS_GLYPH.error);
      const version = check.version ? chalk.dim(` ${check.version}`) : "";
      console.log(`  ${icon} ${chalk.bold(check.name)}${version} ${chalk.dim(check.purpose)}`);

      if (!check.installed) {
        allGood = false;
        if (check.installCmd) {
          if (check.installCmd.startsWith("http")) {
            console.log(chalk.dim(`    ${check.installCmd}`));
          } else {
            console.log(chalk.dim(`    ${check.installCmd}`));
          }
        }
      }
    }

    console.log(chalk.dim("\n  configuration\n"));
    try {
      const config = loadConfig();
      console.log(`  ${chalk.hex("#7C8CFF")(STATUS_GLYPH.active)} config loaded`);
      console.log(chalk.dim(`    reasoning: ${config.models.reasoning.provider}/${config.models.reasoning.model}`));
      console.log(chalk.dim(`    stt: ${config.voice.stt.provider}`));
      console.log(chalk.dim(`    tts: ${config.voice.tts.provider}`));

      if (config.models.reasoning.provider === "ollama") {
        try {
          const res = execFileSync("ollama", ["list"], { timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
          const models = res.trim().split("\n").slice(1).map(l => l.split(/\s+/)[0]);
          if (models.length === 0) {
            console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} no ollama models. run: ollama pull llama3.2:1b`));
          } else if (!models.some(m => m.includes("llama3.2"))) {
            console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} llama3.2 not found. available: ${models.join(", ")}`));
          } else {
            console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.active} ollama model available`));
          }
        } catch {
          console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} cannot reach ollama`));
        }
      }
    } catch {
      console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} no config. run: korvid init`));
    }

    console.log("");
    if (allGood) {
      console.log(chalk.hex("#7C8CFF")("  all dependencies installed"));
    } else {
      console.log(chalk.hex("#FF6B4A")("  some dependencies missing. reduced functionality."));
    }
    console.log("");
  });

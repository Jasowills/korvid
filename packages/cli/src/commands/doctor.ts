import { Command } from "commander";
import * as p from "@clack/prompts";
import { execFileSync } from "node:child_process";
import { loadConfig } from "@korvid/shared/config-file.js";
import { platformHint, detectEnvKey } from "../utils.js";

interface CheckResult {
  name: string;
  installed: boolean;
  version?: string;
  purpose: string;
  installCmd?: string;
  brewPkg?: string;
  pipPkg?: string;
  autoInstall?: () => boolean;
}

function checkCmd(name: string, cmd: string, args: string[], purpose: string, installCmd?: string, brewPkg?: string, pipPkg?: string): CheckResult {
  try {
    const version = execFileSync(cmd, args, { timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim().split("\n")[0];
    return { name, installed: true, version, purpose, installCmd, brewPkg, pipPkg };
  } catch {
    return { name, installed: false, purpose, installCmd, brewPkg, pipPkg };
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

function checkWhisper(): CheckResult {
  try {
    execFileSync("python3", ["-c", "import whisper; print(whisper.__version__)"], { timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    return { name: "Whisper (STT)", installed: true, purpose: "speech-to-text" };
  } catch {
    return { name: "Whisper (STT)", installed: false, purpose: "speech-to-text", pipPkg: "openai-whisper" };
  }
}

function checkWhisperCpp(): CheckResult {
  try {
    execFileSync("whisper-cpp", ["--help"], { timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
    return { name: "Whisper.cpp", installed: true, purpose: "fast speech-to-text" };
  } catch {
    return { name: "Whisper.cpp", installed: false, purpose: "fast speech-to-text", brewPkg: "whisper-cpp" };
  }
}

function installBrew(pkg: string): boolean {
  try {
    execFileSync("brew", ["install", pkg], { timeout: 120_000, stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

function installPip(pkg: string): boolean {
  try {
    execFileSync("pip3", ["install", pkg], { timeout: 120_000, stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

function formatCheck(r: CheckResult): string {
  const icon = r.installed ? "\x1b[38;2;124;140;255m●\x1b[0m" : "\x1b[38;2;255;107;74m✕\x1b[0m";
  const ver = r.version ? ` \x1b[2m${r.version}\x1b[0m` : "";
  const purpose = ` \x1b[2m${r.purpose}\x1b[0m`;
  return `  ${icon} ${r.name}${ver}${purpose}`;
}

export const doctorCommand = new Command("doctor")
  .description("Check system dependencies and configuration")
  .option("--fix", "Automatically install missing dependencies")
  .action(async (opts) => {
    p.intro("Korvid Doctor");

    const systemChecks: CheckResult[] = [
      checkCmd("Node.js", "node", ["--version"], "runtime", "https://nodejs.org"),
      checkCmd("pnpm", "pnpm", ["--version"], "package manager", "npm install -g pnpm"),
      checkCmd("Ollama", "ollama", ["--version"], "local llm", "https://ollama.com", "ollama"),
      checkWhisper(),
      checkWhisperCpp(),
      checkCmd("sox", "sox", ["--version"], "microphone", platformHint("sox"), "sox"),
      checkCmd("imagesnap", "imagesnap", ["-h"], "webcam (macos)", platformHint("imagesnap"), "imagesnap"),
      checkCmd("ffmpeg", "ffmpeg", ["-version"], "audio processing", platformHint("ffmpeg"), "ffmpeg"),
      checkCmd("ffplay", "ffplay", ["-version"], "audio playback", platformHint("ffmpeg"), "ffmpeg"),
      checkDocker(),
    ];

    let allGood = true;
    const results: string[] = [];
    const missing: CheckResult[] = [];

    for (const check of systemChecks) {
      const s = p.spinner();
      s.start(`Checking ${check.name}`);
      await new Promise((r) => setTimeout(r, 120));
      results.push(formatCheck(check));
      if (check.installed) {
        s.stop(`${check.name} found`);
      } else {
        s.stop(`${check.name} missing`);
        missing.push(check);
      }
      if (!check.installed) allGood = false;
    }

    // Configuration section
    const configLines: string[] = [];
    let configLoaded = false;
    try {
      const config = loadConfig();
      configLoaded = true;
      configLines.push("  \x1b[38;2;124;140;255m●\x1b[0m config loaded");
      configLines.push(`    \x1b[2mreasoning: ${config.models.reasoning.provider}/${config.models.reasoning.model}\x1b[0m`);
      configLines.push(`    \x1b[2mstt: ${config.voice.stt.provider}\x1b[0m`);
      configLines.push(`    \x1b[2mtts: ${config.voice.tts.provider}\x1b[0m`);

      // Check API keys for configured providers
      const providers = [config.models.reasoning.provider, config.models.fast?.provider].filter(Boolean);
      for (const prov of providers) {
        if (prov === "ollama") continue;
        if (!detectEnvKey(prov)) {
          configLines.push(`  \x1b[38;2;255;107;74m✕\x1b[0m ${prov} API key not set`);
          configLines.push(`    \x1b[2mset: export ${ENV_KEY_MAP[prov]}=your-key\x1b[0m`);
          allGood = false;
        }
      }

      if (config.models.reasoning.provider === "ollama") {
        try {
          const res = execFileSync("ollama", ["list"], { timeout: 5000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
          const models = res.trim().split("\n").slice(1).map((l) => l.split(/\s+/)[0]);
          if (models.length === 0) {
            configLines.push("  \x1b[38;2;255;107;74m✕\x1b[0m no ollama models");
            configLines.push("    \x1b[2mrun: ollama pull llama3.2\x1b[0m");
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

      // Check STT dependency
      if (config.voice.stt.provider === "local-whisper") {
        const whisperCheck = systemChecks.find(c => c.name === "Whisper (STT)");
        if (whisperCheck && !whisperCheck.installed) {
          configLines.push("  \x1b[38;2;255;107;74m✕\x1b[0m local-whisper configured but whisper not installed");
          allGood = false;
        }
      }

      // Bun detection — WhatsApp and Telegram require Node
      if (config.messaging.whatsapp.enabled || config.messaging.telegram.enabled) {
        const isBun = "Bun" in globalThis;
        if (isBun) {
          configLines.push("  \x1b[38;2;255;107;74m✕\x1b[0m messaging channels require Node.js (not Bun)");
          configLines.push("    \x1b[2mWhatsApp and Telegram use native Node modules\x1b[0m");
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

    // Auto-fix mode
    if (opts.fix && missing.length > 0) {
      p.log.info(`Found ${missing.length} missing dependencies`);

      const autoInstallable = missing.filter(c => c.brewPkg || c.pipPkg);
      const manualOnly = missing.filter(c => !c.brewPkg && !c.pipPkg);

      if (autoInstallable.length > 0) {
        const confirm = await p.confirm({
          message: `Install ${autoInstallable.length} dependencies? (${autoInstallable.map(c => c.name).join(", ")})`,
        });
        if (p.isCancel(confirm)) { p.cancel("aborted."); process.exit(0); }

        if (confirm) {
          for (const dep of autoInstallable) {
            const s = p.spinner();
            s.start(`Installing ${dep.name}...`);
            let ok = false;
            if (dep.brewPkg && process.platform !== "win32") {
              ok = installBrew(dep.brewPkg);
            } else if (dep.pipPkg) {
              ok = installPip(dep.pipPkg);
            }
            if (ok) {
              s.stop(`${dep.name} installed`);
            } else {
              s.stop(`${dep.name} install failed — try manually`);
            }
          }
        }
      }

      if (manualOnly.length > 0) {
        p.note(
          manualOnly.map(c => `  \x1b[2m${c.name}: ${c.installCmd ?? "install manually"}\x1b[0m`).join("\n"),
          "Cannot auto-install"
        );
      }
    } else if (missing.length > 0) {
      // Show install hints
      const installable = missing.filter(c => c.brewPkg || c.pipPkg);
      const manualOnly = missing.filter(c => !c.brewPkg && !c.pipPkg);

      if (installable.length > 0) {
        p.note(
          installable.map(c => {
            const cmd = c.brewPkg ? `brew install ${c.brewPkg}` : `pip3 install ${c.pipPkg}`;
            return `  \x1b[2m${c.name}: ${cmd}\x1b[0m`;
          }).join("\n") + `\n\n  Or run: \x1b[38;2;124;140;255mkorvid doctor --fix\x1b[0m`,
          "Quick install"
        );
      }
      if (manualOnly.length > 0) {
        p.note(
          manualOnly.map(c => `  \x1b[2m${c.name}: ${c.installCmd ?? "install manually"}\x1b[0m`).join("\n"),
          "Manual install required"
        );
      }
    }

    if (allGood) {
      p.outro("All dependencies installed.");
    } else {
      p.outro("Some dependencies missing — reduced functionality.");
    }
  });

const ENV_KEY_MAP: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  deepgram: "DEEPGRAM_API_KEY",
  elevenlabs: "ELEVENLABS_API_KEY",
  cartesia: "CARTESIA_API_KEY",
};

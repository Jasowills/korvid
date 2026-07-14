import { Command } from "commander";
import * as p from "@clack/prompts";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { KorvidConfigSchema, type KorvidConfig } from "@korvid/shared";
import { writeConfig, loadConfig, configExists, getConfigPath } from "@korvid/shared/config-file.js";
import {
  ENV_KEY_MAP, PROVIDER_DEFAULTS, FAST_MODEL_DEFAULTS,
  detectEnvKey, checkInstalled, platformHint, getOllamaModels,
} from "../utils.js";

function cancelGuard<T>(value: T | symbol): T | never {
  if (p.isCancel(value)) {
    p.cancel("aborted.");
    process.exit(0);
  }
  return value as T;
}

// ── Init command ─────────────────────────────────────────────────
export const initCommand = new Command("init")
  .description("Initialize Korvid configuration")
  .option("--defaults", "Use all default settings (non-interactive)")
  .action(async (opts) => {
    p.intro("Korvid");

    let existingConfig: KorvidConfig | null = null;
    let configCorrupted = false;
    if (configExists()) {
      try {
        existingConfig = loadConfig();
      } catch {
        configCorrupted = true;
      }
    }

    // ── Re-run handling ─────────────────────────────────────────
    if (configCorrupted) {
      p.log.warn("Config file is corrupted or invalid.");
      const action = cancelGuard(
        await p.select({
          message: "What would you like to do?",
          options: [
            { value: "overwrite", label: "Start fresh", hint: "Delete and recreate config" },
            { value: "doctor", label: "Run diagnostics", hint: "Exit and run korvid doctor" },
          ],
        })
      );
      if (action === "doctor") {
        p.outro("Run: korvid doctor");
        return;
      }
    }

    if (existingConfig && !configCorrupted && !opts.defaults) {
      const action = cancelGuard(
        await p.select({
          message: "Config already exists. What would you like to do?",
          options: [
            { value: "keep", label: "Keep current config", hint: "Exit without changes" },
            { value: "verify", label: "Verify & repair", hint: "Test current config, fix issues" },
            { value: "advanced", label: "Reconfigure", hint: "Walk through all settings again" },
            { value: "overwrite", label: "Start fresh", hint: "Delete config and start over" },
          ],
          initialValue: "verify",
        })
      );

      if (action === "keep") {
        p.outro("Config unchanged.");
        return;
      }

      if (action === "verify") {
        await verifyAndRepair(existingConfig);
        return;
      }

      if (action === "overwrite") {
        const confirm = cancelGuard(
          await p.confirm({ message: "This will delete your current config. Continue?", initialValue: false })
        );
        if (!confirm) {
          p.cancel("aborted.");
          return;
        }
      }
    }

    // ── Flow choice ─────────────────────────────────────────────
    let config: KorvidConfig;

    if (opts.defaults) {
      config = KorvidConfigSchema.parse({});
      p.log.info("Using all defaults (Ollama local, manual wake word, local STT/TTS).");
    } else {
      const mode = cancelGuard(
        await p.select({
          message: "How would you like to set up?",
          options: [
            { value: "quick", label: "Quick setup", hint: "Sensible defaults, minimal prompts" },
            { value: "advanced", label: "Advanced", hint: "Configure every setting" },
          ],
          initialValue: "quick",
        })
      );

      if (mode === "quick") {
        config = await runQuickStart();
      } else {
        config = await runAdvancedWizard();
      }
    }

    // ── Write config ────────────────────────────────────────────
    const s = p.spinner();
    s.start("Writing config");
    writeConfig(config);
    const path = getConfigPath();
    s.stop(`Config written to ${path}`);

    // ── Dependency checks ───────────────────────────────────────
    await runSystemChecks(config);

    // ── Messaging setup ─────────────────────────────────────────
    await offerMessagingSetup(config);

    // ── Write config again (messaging may have changed it) ──────
    writeConfig(config);

    // ── Closing ─────────────────────────────────────────────────
    printNextSteps(config);

    const startChoice = cancelGuard(
      await p.select({
        message: "How would you like to start?",
        options: [
          { value: "terminal", label: "Terminal", hint: "korvid voice — start talking" },
          { value: "browser", label: "Browser", hint: "Open the dashboard" },
          { value: "later", label: "Decide later", hint: "Exit for now" },
        ],
        initialValue: "terminal",
      })
    );

    if (startChoice === "terminal") {
      p.outro("Run: korvid voice");
    } else if (startChoice === "browser") {
      p.note(
        `  1. Start the gateway:  korvid start\n  2. Open in browser:    http://localhost:${config.gateway.port}\n\n  The gateway must be running for the dashboard to work.`,
        "Dashboard"
      );
      p.outro("Run: korvid start");
    } else {
      p.outro("Done. Korvid is configured.");
    }
  });

// ── Quick Start ──────────────────────────────────────────────────
async function runQuickStart(): Promise<KorvidConfig> {
  // Detect any existing API keys from env
  const detectedKeys: string[] = [];
  for (const [provider, envVar] of Object.entries(ENV_KEY_MAP)) {
    if (process.env[envVar]) detectedKeys.push(provider);
  }

  // Detect Ollama
  const hasOllama = checkInstalled("ollama", ["--version"]);

  // ── Reasoning model (the one thing we can't fully default) ────
  const reasoningProvider = cancelGuard(
    await p.select({
      message: "Reasoning model provider?",
      options: [
        { value: "ollama", label: "Ollama", hint: hasOllama ? "Local, free — detected on your system" : "Local, free — requires install" },
        { value: "anthropic", label: "Anthropic", hint: detectedKeys.includes("anthropic") ? "Claude — API key detected" : "Claude — requires API key" },
        { value: "openai", label: "OpenAI", hint: detectedKeys.includes("openai") ? "GPT — API key detected" : "GPT — requires API key" },
        { value: "google", label: "Google Gemini", hint: detectedKeys.includes("google") ? "Gemini — API key detected" : "Gemini — requires API key" },
        { value: "groq", label: "Groq", hint: detectedKeys.includes("groq") ? "Fast inference — API key detected" : "Fast inference — requires API key" },
        { value: "openrouter", label: "OpenRouter", hint: "Multi-provider — auto-routes to best model" },
      ],
      initialValue: hasOllama ? "ollama" : detectedKeys[0] || "ollama",
    })
  );

  let reasoningModel: string;
  let reasoningApiKey: string | undefined;

  if (reasoningProvider === "ollama") {
    const models = getOllamaModels();
    if (models.length > 0) {
      reasoningModel = cancelGuard(
        await p.select({
          message: "Which Ollama model?",
          options: models.map((m) => ({
            value: m,
            label: m,
            hint: m.includes("llama3.2") ? "recommended" : "",
          })),
          initialValue: models.find((m) => m.includes("llama3.2")) || models[0],
        })
      );
    } else {
      reasoningModel = "llama3.2";
      p.log.warn("No Ollama models found. Pull one: ollama pull llama3.2");
    }
    reasoningApiKey = undefined;
  } else if (reasoningProvider === "openrouter") {
    reasoningModel = "openrouter/auto";
    const envKey = detectEnvKey(reasoningProvider);
    if (envKey) {
      reasoningApiKey = envKey;
      p.log.info(`Using API key from ${ENV_KEY_MAP[reasoningProvider]}`);
    } else {
      reasoningApiKey = cancelGuard(
        await p.password({ message: "OpenRouter API key:", mask: "*" })
      );
    }
  } else {
    reasoningModel = PROVIDER_DEFAULTS[reasoningProvider];
    const envKey = detectEnvKey(reasoningProvider);
    if (envKey) {
      reasoningApiKey = envKey;
      p.log.info(`Using API key from ${ENV_KEY_MAP[reasoningProvider]}`);
    } else {
      reasoningApiKey = cancelGuard(
        await p.password({ message: `API key for ${reasoningProvider}:`, mask: "*" })
      );
    }
  }

  // ── Fast model (default: same as reasoning or Groq) ───────────
  const fastProvider = detectedKeys.includes("groq") ? "groq" : reasoningProvider;
  const fastModel = FAST_MODEL_DEFAULTS[fastProvider] || reasoningModel;
  const fastApiKey = fastProvider === reasoningProvider ? reasoningApiKey : detectEnvKey(fastProvider);

  // ── Assemble with defaults for everything else ────────────────
  return KorvidConfigSchema.parse({
    models: {
      reasoning: { provider: reasoningProvider, model: reasoningModel, apiKey: reasoningApiKey },
      fast: { provider: fastProvider, model: fastModel, apiKey: fastApiKey },
    },
    voice: {
      wakeWord: { engine: "manual" },
      stt: { provider: "local-whisper" },
      tts: { provider: "local" },
      clapActivation: { enabled: true, clapWindowMs: 700, sensitivity: 0.5 },
    },
    gateway: { port: 3847 },
  });
}

// ── Advanced Wizard ──────────────────────────────────────────────
async function runAdvancedWizard(): Promise<KorvidConfig> {
  // ── Model Provider ─────────────────────────────────────────────
  const reasoningProvider = cancelGuard(
    await p.select({
      message: "Reasoning model provider?",
      options: [
        { value: "ollama", label: "Ollama", hint: "Local, free — recommended for dev" },
        { value: "anthropic", label: "Anthropic", hint: "Claude models — requires API key" },
        { value: "openai", label: "OpenAI", hint: "GPT models — requires API key" },
        { value: "google", label: "Google Gemini", hint: "Gemini models — requires API key" },
        { value: "groq", label: "Groq", hint: "Fast inference — requires API key" },
        { value: "openrouter", label: "OpenRouter", hint: "Multi-provider router — requires API key" },
      ],
      initialValue: "ollama",
    })
  );

  let reasoningModel: string;
  let reasoningApiKey: string | undefined;

  if (reasoningProvider === "ollama") {
    const models = getOllamaModels();
    if (models.length > 0) {
      reasoningModel = cancelGuard(
        await p.select({
          message: "Which Ollama model?",
          options: models.map((m) => ({
            value: m,
            label: m,
            hint: m.includes("llama3.2") ? "recommended" : "",
          })),
          initialValue: models.find((m) => m.includes("llama3.2")) || models[0],
        })
      );
    } else {
      reasoningModel = cancelGuard(
        await p.text({ message: "Ollama model name:", defaultValue: "llama3.2" })
      );
    }
    reasoningApiKey = undefined;
  } else if (reasoningProvider === "openrouter") {
    reasoningModel = cancelGuard(
      await p.text({
        message: "Model (use openrouter/auto for auto-routing):",
        defaultValue: "openrouter/auto",
      })
    );
    const envKey = detectEnvKey(reasoningProvider);
    if (envKey) {
      const useEnv = cancelGuard(
        await p.confirm({ message: `Use API key from ${ENV_KEY_MAP[reasoningProvider]}?`, initialValue: true })
      );
      reasoningApiKey = useEnv ? envKey : cancelGuard(await p.password({ message: "OpenRouter API key:", mask: "*" }));
    } else {
      reasoningApiKey = cancelGuard(await p.password({ message: "OpenRouter API key:", mask: "*" }));
    }
  } else {
    reasoningModel = cancelGuard(
      await p.text({
        message: "Model name:",
        defaultValue: PROVIDER_DEFAULTS[reasoningProvider],
      })
    );
    const envKey = detectEnvKey(reasoningProvider);
    if (envKey) {
      const useEnv = cancelGuard(
        await p.confirm({ message: `Use API key from ${ENV_KEY_MAP[reasoningProvider]}?`, initialValue: true })
      );
      reasoningApiKey = useEnv ? envKey : cancelGuard(await p.password({ message: `API key for ${reasoningProvider}:`, mask: "*" }));
    } else {
      reasoningApiKey = cancelGuard(await p.password({ message: `API key for ${reasoningProvider}:`, mask: "*" }));
    }
  }

  // ── Fast Model ─────────────────────────────────────────────────
  const useFastModel = cancelGuard(
    await p.confirm({ message: "Configure a separate fast/routing model?", initialValue: true })
  );

  let fastProvider = reasoningProvider;
  let fastModel = reasoningModel;
  let fastApiKey = reasoningApiKey;

  if (useFastModel) {
    fastProvider = cancelGuard(
      await p.select({
        message: "Fast model provider:",
        options: [
          { value: "groq", label: "Groq", hint: "Fastest inference, cheap" },
          { value: "ollama", label: "Ollama", hint: "Local, free" },
          { value: "google", label: "Google Gemini Flash", hint: "Fast, cheap" },
          { value: reasoningProvider, label: "Same as reasoning provider", hint: "" },
        ],
        initialValue: "groq",
      })
    );

    if (fastProvider === "ollama") {
      const models = getOllamaModels();
      if (models.length > 0) {
        fastModel = cancelGuard(
          await p.select({
            message: "Which Ollama model for fast?",
            options: models.map((m) => ({ value: m, label: m })),
            initialValue: models.find((m) => m.includes("llama3.2")) || models[0],
          })
        );
      } else {
        fastModel = cancelGuard(await p.text({ message: "Ollama model name:", defaultValue: "llama3.2" }));
      }
    } else {
      fastModel = cancelGuard(
        await p.text({ message: "Fast model name:", defaultValue: FAST_MODEL_DEFAULTS[fastProvider] || "" })
      );
      const envKey = detectEnvKey(fastProvider);
      if (envKey) {
        const useEnv = cancelGuard(
          await p.confirm({ message: `Use API key from ${ENV_KEY_MAP[fastProvider]}?`, initialValue: true })
        );
        fastApiKey = useEnv ? envKey : cancelGuard(await p.password({ message: `API key for ${fastProvider}:`, mask: "*" }));
      } else {
        fastApiKey = cancelGuard(await p.password({ message: `API key for ${fastProvider} (Enter to reuse reasoning key):`, mask: "*" }));
        fastApiKey = fastApiKey || reasoningApiKey;
      }
    }
  }

  // ── Wake Word ──────────────────────────────────────────────────
  const wakeEngine = cancelGuard(
    await p.select({
      message: "Wake word detection engine:",
      options: [
        { value: "manual", label: "Manual trigger", hint: "Keyboard/CLI — recommended for dev" },
        { value: "porcupine", label: "Porcupine", hint: "On-device, requires API key" },
        { value: "openwakeword", label: "openWakeWord", hint: "On-device, free" },
      ],
      initialValue: "manual",
    })
  );

  // ── STT ────────────────────────────────────────────────────────
  const sttProvider = cancelGuard(
    await p.select({
      message: "Speech-to-text provider:",
      options: [
        { value: "local-whisper", label: "Local Whisper", hint: "Free, offline" },
        { value: "groq", label: "Groq Whisper", hint: "Fast, cheap" },
        { value: "deepgram", label: "Deepgram", hint: "Fast, accurate" },
      ],
      initialValue: "local-whisper",
    })
  );

  let sttApiKey: string | undefined;
  if (sttProvider !== "local-whisper") {
    const envKey = detectEnvKey(sttProvider);
    if (envKey) {
      const useEnv = cancelGuard(
        await p.confirm({ message: `Use API key from ${ENV_KEY_MAP[sttProvider]}?`, initialValue: true })
      );
      sttApiKey = useEnv ? envKey : cancelGuard(await p.password({ message: `API key for ${sttProvider} STT:`, mask: "*" }));
    } else {
      sttApiKey = cancelGuard(await p.password({ message: `API key for ${sttProvider} STT:`, mask: "*" }));
    }
  }

  // ── TTS ────────────────────────────────────────────────────────
  const ttsProvider = cancelGuard(
    await p.select({
      message: "Text-to-speech provider:",
      options: [
        { value: "local", label: "Local (macOS say / system TTS)", hint: "Free" },
        { value: "elevenlabs", label: "ElevenLabs", hint: "High quality, requires API key" },
        { value: "cartesia", label: "Cartesia", hint: "Low-latency, requires API key" },
      ],
      initialValue: "local",
    })
  );

  let ttsApiKey: string | undefined;
  let ttsVoiceId: string | undefined;
  if (ttsProvider !== "local") {
    const envKey = detectEnvKey(ttsProvider);
    if (envKey) {
      const useEnv = cancelGuard(
        await p.confirm({ message: `Use API key from ${ENV_KEY_MAP[ttsProvider]}?`, initialValue: true })
      );
      ttsApiKey = useEnv ? envKey : cancelGuard(await p.password({ message: `API key for ${ttsProvider} TTS:`, mask: "*" }));
    } else {
      ttsApiKey = cancelGuard(await p.password({ message: `API key for ${ttsProvider} TTS:`, mask: "*" }));
    }
    const voiceId = cancelGuard(
      await p.text({ message: "Voice ID (blank for default):", defaultValue: "" })
    );
    ttsVoiceId = voiceId || undefined;
  }

  // ── Gateway ────────────────────────────────────────────────────
  const portStr = cancelGuard(
    await p.text({ message: "Gateway port:", defaultValue: "3847" })
  );
  const port = parseInt(portStr, 10) || 3847;

  const authToken = cancelGuard(
    await p.confirm({ message: "Enable gateway auth token?", initialValue: true })
  );

  // ── Clap Activation ──────────────────────────────────────────────
  const enableClap = cancelGuard(
    await p.confirm({ message: "Enable clap-to-wake?", initialValue: true })
  );

  // ── Assemble ───────────────────────────────────────────────────
  const config: KorvidConfig = KorvidConfigSchema.parse({
    models: {
      reasoning: { provider: reasoningProvider, model: reasoningModel, apiKey: reasoningApiKey },
      fast: { provider: fastProvider, model: fastModel, apiKey: fastApiKey },
    },
    voice: {
      wakeWord: { engine: wakeEngine },
      stt: { provider: sttProvider, apiKey: sttApiKey },
      tts: { provider: ttsProvider, apiKey: ttsApiKey, voiceId: ttsVoiceId },
      clapActivation: { enabled: enableClap, clapWindowMs: 700, sensitivity: 0.5 },
    },
    gateway: {
      port,
      auth: authToken ? { token: generateToken() } : {},
    },
  });

  return config;
}

// ── Verify & Repair ──────────────────────────────────────────────
async function verifyAndRepair(config: KorvidConfig): Promise<void> {
  p.log.step("Verifying current configuration...");

  const issues: string[] = [];

  // Check reasoning model
  const s = p.spinner();
  s.start("Testing reasoning model connection");
  if (config.models.reasoning.provider === "ollama") {
    try {
      execFileSync("ollama", ["list"], { timeout: 5000, stdio: "pipe" });
      s.stop("Ollama reachable");
    } catch {
      s.stop("Ollama not reachable");
      issues.push("Ollama is not running. Start it: ollama serve");
    }
  } else {
    const hasKey = config.models.reasoning.apiKey || detectEnvKey(config.models.reasoning.provider);
    if (hasKey) {
      s.stop(`API key configured for ${config.models.reasoning.provider}`);
    } else {
      s.stop(`No API key for ${config.models.reasoning.provider}`);
      issues.push(`Missing API key for ${config.models.reasoning.provider}. Run: korvid init`);
    }
  }

  // Check voice deps
  await runSystemChecks(config);

  if (issues.length > 0) {
    p.note(issues.join("\n"), "Issues found");
    const fix = cancelGuard(
      await p.confirm({ message: "Run full reconfiguration?", initialValue: true })
    );
    if (fix) {
      const newConfig = await runAdvancedWizard();
      const s2 = p.spinner();
      s2.start("Writing config");
      writeConfig(newConfig);
      s2.stop("Config updated");
    }
  } else {
    p.outro("Configuration looks good.");
  }
}

// ── Messaging Setup ──────────────────────────────────────────────
async function offerMessagingSetup(config: KorvidConfig): Promise<void> {
  const setup = cancelGuard(
    await p.confirm({
      message: "Set up WhatsApp or Telegram now?",
      initialValue: false,
    })
  );

  if (!setup) {
    p.log.info("Skipped. Run: korvid channels add");
    return;
  }

  const channel = cancelGuard(
    await p.select({
      message: "Which channel?",
      options: [
        { value: "whatsapp", label: "WhatsApp", hint: "QR code linking (like WhatsApp Web)" },
        { value: "telegram", label: "Telegram", hint: "Bot token from @BotFather" },
      ],
    })
  );

  const s = p.spinner();

  if (channel === "telegram") {
    const botToken = cancelGuard(await p.password({ message: "Telegram bot token:", mask: "*" }));
    s.start("Validating bot token against Telegram API...");
    const { validateTelegramToken } = await import("@korvid/messaging");
    const result = await validateTelegramToken(botToken);
    if (result.ok) {
      s.stop(`Bot verified: @${result.botName}`);
      const dmPolicy = cancelGuard(
        await p.select({
          message: "DM security posture?",
          options: [
            { value: "pairing", label: "Pairing (Recommended)" },
            { value: "allowlist", label: "Allowlist (pre-approved IDs only)" },
          ],
          initialValue: "pairing",
        })
      );
      let allowFrom: string[] = [];
      if (dmPolicy === "allowlist") {
        const ids = cancelGuard(
          await p.text({
            message: "Comma-separated Telegram user IDs:",
            placeholder: "123456789,987654321",
          })
        );
        allowFrom = ids.split(",").map((s) => s.trim()).filter(Boolean);
      }
      config.messaging.telegram = { enabled: true, botToken, dmPolicy: dmPolicy as "pairing" | "allowlist", allowFrom };
      p.log.info("Telegram configured. Send /start to your bot to begin.");
    } else {
      s.stop("Token validation failed");
      p.log.error(`Error: ${result.error}`);
      p.log.warn("You can reconfigure later: korvid channels add --channel telegram");
    }
  } else {
    p.log.info("WhatsApp uses QR linking (like WhatsApp Web).");
    p.log.info("You'll scan a QR code with your phone → Settings → Linked Devices.");
    p.log.info("Use a real phone number (VoIP/virtual numbers may be blocked).");
    p.log.info("");
    p.log.info("Run this after the gateway starts: korvid channels login --channel whatsapp");
    config.messaging.whatsapp = { enabled: true, dmPolicy: "pairing", allowFrom: [], authDir: "~/.korvid/credentials/whatsapp" };
  }
}

// ── Next Steps ───────────────────────────────────────────────────
function printNextSteps(config: KorvidConfig): void {
  const steps: string[] = [];

  if (config.models.reasoning.provider === "ollama") {
    steps.push("1. Start Ollama:     ollama serve");
    steps.push("2. Start Korvid:     korvid voice");
  } else {
    steps.push("1. Start Korvid:     korvid voice");
  }

  steps.push("");
  steps.push("Diagnostics:  korvid doctor");
  steps.push("Models:        korvid models list");
  if (!config.messaging.whatsapp?.enabled && !config.messaging.telegram?.enabled) {
    steps.push("Channels:      korvid channels add");
  }

  p.note(steps.join("\n"), "Next steps");
}

// ── System Checks ────────────────────────────────────────────────
async function runSystemChecks(config: KorvidConfig) {
  const checks: { name: string; ok: boolean; hint?: string }[] = [];

  checks.push({ name: "Node.js", ok: true });
  checks.push({ name: "Ollama", ok: checkInstalled("ollama", ["--version"]), hint: platformHint("ollama") });

  if (config.voice.stt.provider === "local-whisper") {
    const hasWhisper = checkInstalled("whisper", ["--help"]) || checkInstalled("python3", ["-c", "import whisper"]);
    checks.push({ name: "Whisper (STT)", ok: hasWhisper, hint: "pip install openai-whisper" });
  }

  if (config.voice.tts.provider === "local") {
    const hasSay = process.platform === "darwin";
    checks.push({ name: "System TTS", ok: hasSay, hint: "macOS 'say' required for local TTS" });
  }

  const hasSox = checkInstalled("sox", ["--version"]);
  checks.push({ name: "Sox (mic recording)", ok: hasSox, hint: platformHint("sox") });

  const hasFfmpeg = checkInstalled("ffmpeg", ["-version"]);
  checks.push({ name: "FFmpeg (audio/video)", ok: hasFfmpeg, hint: platformHint("ffmpeg") });

  const hasImagesnap = checkInstalled("imagesnap", ["-h"]);
  checks.push({ name: "ImageSnap (webcam)", ok: hasImagesnap, hint: platformHint("imagesnap") });

  for (const check of checks) {
    const s = p.spinner();
    s.start(`Checking ${check.name}`);
    await new Promise((r) => setTimeout(r, 100));
    if (check.ok) {
      s.stop(`${check.name} found`);
    } else {
      s.stop(`${check.name} missing`);
      if (check.hint) p.log.warn(check.hint);
    }
  }
}

// ── Token generator ──────────────────────────────────────────────
function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

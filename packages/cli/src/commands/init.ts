import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { execFileSync } from "node:child_process";
import { KorvidConfigSchema, type KorvidConfig } from "@korvid/shared";
import { writeConfig, configExists, getConfigPath } from "@korvid/shared/config-file.js";
import { brandBoot, STATUS_GLYPH } from "../brand.js";

export const initCommand = new Command("init")
  .description("Initialize Korvid configuration")
  .option("--defaults", "Use all default settings (non-interactive)")
  .action(async (opts) => {
    console.log(brandBoot());
    console.log(chalk.dim("  configuring korvid.\n"));

    if (configExists() && !opts.defaults) {
      const { overwrite } = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: `config exists at ${getConfigPath()}. overwrite?`,
          default: false,
        },
      ]);
      if (!overwrite) {
        console.log(chalk.dim("  aborted."));
        return;
      }
    }

    let config: KorvidConfig;

    if (opts.defaults) {
      config = KorvidConfigSchema.parse({});
      console.log(chalk.dim("  Using all defaults (Ollama local, manual wake word, local STT/TTS).\n"));
    } else {
      config = await runWizard();
    }

    writeConfig(config);
    const path = getConfigPath();

    console.log(chalk.hex("#7C8CFF")(`\n  ${STATUS_GLYPH.active} configured.`));
    console.log(chalk.dim(`  ${path}\n`));

    console.log(chalk.dim("  checking dependencies...\n"));
    await runSystemChecks(config);

    console.log(chalk.dim("  next steps:"));
    console.log(chalk.dim("    1. start ollama:        ollama serve"));
    console.log(chalk.dim("    2. pull a model:        ollama pull llama3.2"));
    console.log(chalk.dim("    3. start korvid:        korvid start"));
    console.log(chalk.dim("    4. check diagnostics:   korvid doctor\n"));
  });

async function runWizard(): Promise<KorvidConfig> {
  // ── Model Provider ─────────────────────────────────────────────
  const { reasoningProvider } = await inquirer.prompt([
    {
      type: "list",
      name: "reasoningProvider",
      message: "Which reasoning model provider?",
      choices: [
        { name: "Ollama (local, free — recommended for dev)", value: "ollama" },
        { name: "Anthropic (Claude)", value: "anthropic" },
        { name: "OpenAI (GPT)", value: "openai" },
        { name: "Google (Gemini)", value: "google" },
        { name: "Groq (fast, cheap)", value: "groq" },
        { name: "OpenRouter (multi-provider)", value: "openrouter" },
      ],
      default: "ollama",
    },
  ]);

  let reasoningModel = "llama3.2";
  let reasoningApiKey: string | undefined;

  if (reasoningProvider === "ollama") {
    const { model } = await inquirer.prompt([
      {
        type: "input",
        name: "model",
        message: "Ollama model name:",
        default: "llama3.2",
      },
    ]);
    reasoningModel = model;
  } else {
    const { model, apiKey } = await inquirer.prompt([
      {
        type: "input",
        name: "model",
        message: "Model name (provider/model format, e.g. claude-sonnet-4-6):",
        default:
          reasoningProvider === "anthropic"
            ? "claude-sonnet-4-6"
            : reasoningProvider === "openai"
              ? "gpt-4o"
              : reasoningProvider === "google"
                ? "gemini-2.5-flash"
                : reasoningProvider === "groq"
                  ? "llama-3.1-8b-instant"
                  : "anthropic/claude-sonnet-4-6",
      },
      {
        type: "password",
        name: "apiKey",
        message: `API key for ${reasoningProvider}:`,
        mask: "*",
      },
    ]);
    reasoningModel = model;
    reasoningApiKey = apiKey;
  }

  // ── Fast Model ─────────────────────────────────────────────────
  const { useFastModel } = await inquirer.prompt([
    {
      type: "confirm",
      name: "useFastModel",
      message: "Configure a separate fast/routing model?",
      default: reasoningProvider === "ollama",
    },
  ]);

  let fastProvider = reasoningProvider;
  let fastModel = reasoningModel;
  let fastApiKey = reasoningApiKey;

  if (useFastModel) {
    const { provider } = await inquirer.prompt([
      {
        type: "list",
        name: "provider",
        message: "Fast model provider:",
        choices: [
          { name: "Groq (fastest, cheap)", value: "groq" },
          { name: "Ollama (local, free)", value: "ollama" },
          { name: "Google Gemini Flash", value: "google" },
          { name: "Same as reasoning provider", value: reasoningProvider },
        ],
        default: "groq",
      },
    ]);
    fastProvider = provider;

    if (provider !== "ollama") {
      const { model, apiKey } = await inquirer.prompt([
        {
          type: "input",
          name: "model",
          message: "Fast model name:",
          default: "llama-3.1-8b-instant",
        },
        {
          type: "password",
          name: "apiKey",
          message: `API key for ${provider} (or press Enter to reuse reasoning key):`,
          mask: "*",
        },
      ]);
      fastModel = model;
      fastApiKey = apiKey || reasoningApiKey;
    } else {
      const { model } = await inquirer.prompt([
        {
          type: "input",
          name: "model",
          message: "Ollama model name:",
          default: "llama3.2",
        },
      ]);
      fastModel = model;
    }
  }

  // ── Wake Word ──────────────────────────────────────────────────
  const { wakeEngine } = await inquirer.prompt([
    {
      type: "list",
      name: "wakeEngine",
      message: "Wake word detection engine:",
      choices: [
        { name: "Manual trigger (keyboard/CLI — recommended for dev)", value: "manual" },
        { name: "Porcupine (on-device, requires key)", value: "porcupine" },
        { name: "openWakeWord (on-device, free)", value: "openwakeword" },
      ],
      default: "manual",
    },
  ]);

  // ── STT ────────────────────────────────────────────────────────
  const { sttProvider } = await inquirer.prompt([
    {
      type: "list",
      name: "sttProvider",
      message: "Speech-to-text provider:",
      choices: [
        { name: "Local Whisper (free, offline)", value: "local-whisper" },
        { name: "Groq Whisper (fast, cheap)", value: "groq" },
        { name: "Deepgram (fast, accurate)", value: "deepgram" },
      ],
      default: "local-whisper",
    },
  ]);

  let sttApiKey: string | undefined;
  if (sttProvider !== "local-whisper") {
    const { apiKey } = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: `API key for ${sttProvider} STT:`,
        mask: "*",
      },
    ]);
    sttApiKey = apiKey;
  }

  // ── TTS ────────────────────────────────────────────────────────
  const { ttsProvider } = await inquirer.prompt([
    {
      type: "list",
      name: "ttsProvider",
      message: "Text-to-speech provider:",
      choices: [
        { name: "Local (macOS say / system TTS — free)", value: "local" },
        { name: "ElevenLabs (high quality, requires key)", value: "elevenlabs" },
        { name: "Cartesia (low-latency, requires key)", value: "cartesia" },
      ],
      default: "local",
    },
  ]);

  let ttsApiKey: string | undefined;
  let ttsVoiceId: string | undefined;
  if (ttsProvider !== "local") {
    const answers = await inquirer.prompt([
      {
        type: "password",
        name: "apiKey",
        message: `API key for ${ttsProvider} TTS:`,
        mask: "*",
      },
      {
        type: "input",
        name: "voiceId",
        message: "Voice ID (leave blank for default):",
        default: "",
      },
    ]);
    ttsApiKey = answers.apiKey;
    ttsVoiceId = answers.voiceId || undefined;
  }

  // ── Port ───────────────────────────────────────────────────────
  const { port } = await inquirer.prompt([
    {
      type: "number",
      name: "port",
      message: "Gateway port:",
      default: 3847,
    },
  ]);

  // ── Assemble ───────────────────────────────────────────────────
  const config: KorvidConfig = KorvidConfigSchema.parse({
    models: {
      reasoning: {
        provider: reasoningProvider,
        model: reasoningModel,
        apiKey: reasoningApiKey,
      },
      fast: {
        provider: fastProvider,
        model: fastModel,
        apiKey: fastApiKey,
      },
    },
    voice: {
      wakeWord: { engine: wakeEngine },
      stt: { provider: sttProvider, apiKey: sttApiKey },
      tts: { provider: ttsProvider, apiKey: ttsApiKey, voiceId: ttsVoiceId },
    },
    gateway: { port },
  });

  return config;
}

function checkInstalled(cmd: string, args: string[]): boolean {
  try {
    execFileSync(cmd, args, { timeout: 5000, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

async function runSystemChecks(config: KorvidConfig) {
  const checks: { name: string; ok: boolean; hint?: string }[] = [];

  checks.push({ name: "Node.js", ok: true });
  checks.push({ name: "Ollama", ok: checkInstalled("ollama", ["--version"]), hint: "brew install ollama" });

  if (config.voice.stt.provider === "local-whisper") {
    const hasWhisper = checkInstalled("whisper", ["--help"]) || checkInstalled("python3", ["-c", "import whisper"]);
    checks.push({ name: "Whisper (STT)", ok: hasWhisper, hint: "pip install openai-whisper" });
  }

  if (config.voice.tts.provider === "local") {
    const hasSay = process.platform === "darwin";
    checks.push({ name: "System TTS", ok: hasSay, hint: "macOS 'say' required for local TTS" });
  }

  const hasSox = checkInstalled("sox", ["--version"]);
  checks.push({ name: "Sox (mic recording)", ok: hasSox, hint: "brew install sox" });

  const hasFfmpeg = checkInstalled("ffmpeg", ["-version"]);
  checks.push({ name: "FFmpeg (audio/video)", ok: hasFfmpeg, hint: "brew install ffmpeg" });

  const hasImagesnap = checkInstalled("imagesnap", ["-h"]);
  checks.push({ name: "ImageSnap (webcam)", ok: hasImagesnap, hint: "brew install imagesnap" });

  for (const check of checks) {
    const icon = check.ok ? chalk.hex("#7C8CFF")(STATUS_GLYPH.active) : chalk.hex("#FF6B4A")(STATUS_GLYPH.error);
    const hint = check.ok ? "" : chalk.dim(` — ${check.hint}`);
    console.log(`  ${icon} ${check.name}${hint}`);
  }

  const missing = checks.filter((c) => !c.ok);
  if (missing.length > 0) {
    console.log(chalk.dim(`\n  ${missing.length} optional dependencies missing. korvid doctor for details.`));
  }
  console.log("");
}

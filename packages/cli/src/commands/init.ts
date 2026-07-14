import { Command } from "commander";
import * as p from "@clack/prompts";
import { execFileSync } from "node:child_process";
import { KorvidConfigSchema, type KorvidConfig } from "@korvid/shared";
import { writeConfig, configExists, getConfigPath } from "@korvid/shared/config-file.js";

function cancelGuard<T>(value: T | symbol): T | never {
  if (p.isCancel(value)) {
    p.cancel("aborted.");
    process.exit(0);
  }
  return value as T;
}

export const initCommand = new Command("init")
  .description("Initialize Korvid configuration")
  .option("--defaults", "Use all default settings (non-interactive)")
  .action(async (opts) => {
    p.intro("Korvid");

    if (configExists() && !opts.defaults) {
      const overwrite = cancelGuard(
        await p.confirm({ message: `Config exists at ${getConfigPath()}. Overwrite?`, initialValue: false })
      );
      if (!overwrite) {
        p.cancel("aborted.");
        return;
      }
    }

    let config: KorvidConfig;

    if (opts.defaults) {
      config = KorvidConfigSchema.parse({});
      p.log.info("Using all defaults (Ollama local, manual wake word, local STT/TTS).");
    } else {
      config = await runWizard();
    }

    const s = p.spinner();
    s.start("Writing config");
    writeConfig(config);
    const path = getConfigPath();
    s.stop(`Config written to ${path}`);

    p.log.step("Checking dependencies...");
    await runSystemChecks(config);

    p.note(
      [
        "1. Start Ollama:       ollama serve",
        "2. Pull a model:       ollama pull llama3.2",
        "3. Start Korvid:       korvid start",
        "4. Diagnostics:        korvid doctor",
      ].join("\n"),
      "Next steps"
    );

    p.outro("Done. Korvid is configured.");
  });

async function runWizard(): Promise<KorvidConfig> {
  // ── Model Provider ─────────────────────────────────────────────
  const reasoningProvider = cancelGuard(
    await p.select({
      message: "Which reasoning model provider?",
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

  let reasoningModel = "llama3.2";
  let reasoningApiKey: string | undefined;

  if (reasoningProvider === "ollama") {
    reasoningModel = cancelGuard(
      await p.text({
        message: "Ollama model name:",
        defaultValue: "llama3.2",
      })
    );
  } else {
    const model = cancelGuard(
      await p.text({
        message: "Model name:",
        defaultValue:
          reasoningProvider === "anthropic"
            ? "claude-sonnet-4-6"
            : reasoningProvider === "openai"
              ? "gpt-4o"
              : reasoningProvider === "google"
                ? "gemini-2.5-flash"
                : reasoningProvider === "groq"
                  ? "llama-3.1-8b-instant"
                  : "anthropic/claude-sonnet-4-6",
      })
    );
    reasoningModel = model;
    reasoningApiKey = cancelGuard(
      await p.password({ message: `API key for ${reasoningProvider}:`, mask: "*" })
    );
  }

  // ── Fast Model ─────────────────────────────────────────────────
  const useFastModel = cancelGuard(
    await p.confirm({
      message: "Configure a separate fast/routing model?",
      initialValue: reasoningProvider === "ollama",
    })
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

    if (fastProvider !== "ollama") {
      const model = cancelGuard(
        await p.text({ message: "Fast model name:", defaultValue: "llama-3.1-8b-instant" })
      );
      fastModel = model;
      const key = cancelGuard(
        await p.password({
          message: `API key for ${fastProvider} (Enter to reuse reasoning key):`,
          mask: "*",
        })
      );
      fastApiKey = key || reasoningApiKey;
    } else {
      fastModel = cancelGuard(
        await p.text({ message: "Ollama model name:", defaultValue: "llama3.2" })
      );
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
    sttApiKey = cancelGuard(
      await p.password({ message: `API key for ${sttProvider} STT:`, mask: "*" })
    );
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
    ttsApiKey = cancelGuard(
      await p.password({ message: `API key for ${ttsProvider} TTS:`, mask: "*" })
    );
    const voiceId = cancelGuard(
      await p.text({ message: "Voice ID (blank for default):", defaultValue: "" })
    );
    ttsVoiceId = voiceId || undefined;
  }

  // ── Port ───────────────────────────────────────────────────────
  const portStr = cancelGuard(
    await p.text({ message: "Gateway port:", defaultValue: "3847" })
  );
  const port = parseInt(portStr, 10) || 3847;

  // ── Assemble ───────────────────────────────────────────────────
  return KorvidConfigSchema.parse({
    models: {
      reasoning: { provider: reasoningProvider, model: reasoningModel, apiKey: reasoningApiKey },
      fast: { provider: fastProvider, model: fastModel, apiKey: fastApiKey },
    },
    voice: {
      wakeWord: { engine: wakeEngine },
      stt: { provider: sttProvider, apiKey: sttApiKey },
      tts: { provider: ttsProvider, apiKey: ttsApiKey, voiceId: ttsVoiceId },
    },
    gateway: { port },
  });
}

function checkInstalled(cmd: string, args: string[]): boolean {
  try {
    execFileSync(cmd, args, { timeout: 5000, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function platformHint(tool: string, brewPkg?: string): string {
  const p2 = process.platform;
  if (p2 === "darwin") return `brew install ${brewPkg ?? tool}`;
  if (p2 === "win32") return `choco install ${brewPkg ?? tool}`;
  return `apt install ${brewPkg ?? tool}`;
}

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
    // Simulate a brief check delay so spinner is visible
    await new Promise((r) => setTimeout(r, 150));
    if (check.ok) {
      s.stop(`${check.name} found`);
    } else {
      s.stop(`${check.name} missing`);
      p.log.warn(`${check.hint ? `${check.hint}` : `Install ${check.name}`}`);
    }
  }
}

import { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "@korvid/shared/config-file.js";
import { createVoicePipeline, createWakeWordDetector, createSTT, createTTS, createReasoningClient, SoundLibrary } from "@korvid/voice";
import { STATUS_GLYPH } from "../brand.js";

export const voiceCommand = new Command("voice")
  .description("Start voice pipeline for testing")
  .option("-t, --trigger", "Trigger once and exit")
  .option("--text <text>", "Process text directly (skip STT)")
  .action(async (opts) => {
    console.log(chalk.dim("\n  voice pipeline\n"));

    let config;
    try {
      config = loadConfig();
    } catch (err) {
      console.error(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} ${err instanceof Error ? err.message : err}`));
      console.error(chalk.dim('  run "korvid init" first.'));
      process.exit(1);
    }

    config.voice.wakeWord.engine = "manual";

    const sounds = new SoundLibrary();
    const wakeWord = createWakeWordDetector(config);
    const stt = createSTT(config);
    const tts = createTTS(config);
    const reasoning = createReasoningClient(config);

    if (opts.text) {
      console.log(chalk.dim(`  input: "${opts.text}"\n`));

      console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.processing} thinking...`));
      const start = Date.now();
      const response = await reasoning.prompt(opts.text);
      const reasoningMs = Date.now() - start;
      console.log(chalk.dim(`  ${reasoningMs}ms\n`));
      console.log(chalk.hex("#7C8CFF")(`  ${response}\n`));

      console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.processing} speaking...`));
      await tts.speak(response);
      const totalMs = Date.now() - start;
      console.log(chalk.dim(`  total: ${totalMs}ms\n`));

      process.exit(0);
    }

    const pipeline = createVoicePipeline({
      wakeWord,
      stt: { transcribe: async () => opts.text ?? "what time is it" },
      reasoning,
      tts,
      sounds: { play: async (name) => sounds.play(name as any) },
    });

    pipeline.on("pipeline", (event: any) => {
      if (event.transcript) {
        console.log(chalk.dim(`  heard: "${event.transcript}"`));
      }
      if (event.response) {
        console.log(chalk.hex("#7C8CFF")(`  ${event.response}`));
      }
      if (event.latencyMs) {
        console.log(chalk.dim(`  ${event.latencyMs}ms`));
      }
      if (event.error) {
        console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} ${event.error}`));
      }
    });

    await pipeline.start();

    if (opts.trigger) {
      console.log(chalk.dim("  triggering...\n"));
      pipeline.trigger();

      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (pipeline.getState() === "idle") {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });

      await pipeline.stop();
      process.exit(0);
    }

    console.log(chalk.dim("  Ctrl+K to trigger, Ctrl+C to stop.\n"));

    const shutdown = async () => {
      await pipeline.stop();
      process.exit(0);
    };
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });

import { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "@korvid/shared/config-file.js";
import { createGateway } from "@korvid/gateway";
import { createDelegationLoop } from "@korvid/delegation";
import { brandBoot, STATUS_GLYPH } from "../brand.js";

export const startCommand = new Command("start")
  .description("Start the Korvid gateway daemon")
  .option("-d, --detach", "Run in background")
  .option("--port <port>", "Override gateway port", Number)
  .option("--voice", "Also start voice pipeline (default: on)")
  .option("--no-voice", "Disable voice pipeline")
  .action(async (opts) => {
    console.log(brandBoot());
    console.log(chalk.dim("  starting gateway...\n"));

    let config;
    try {
      config = loadConfig();
    } catch (err) {
      console.error(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} ${err instanceof Error ? err.message : err}`));
      console.error(chalk.dim('  run "korvid init" to create a config.'));
      process.exit(1);
    }

    if (opts.port) {
      config.gateway.port = opts.port;
    }

    const gateway = createGateway(config);

    const delegation = createDelegationLoop(config);
    delegation.on("event", (event: any) => {
      gateway.broadcast({
        type: "delegation_event",
        event: {
          id: `del-${event.timestamp}`,
          timestamp: event.timestamp,
          type: event.type,
          agent: event.data.agent ?? "unknown",
          status: event.type.includes("completed") ? "completed"
            : event.type.includes("failed") || event.type.includes("error") ? "failed"
            : "running",
          request: String(event.data.request ?? "").slice(0, 200),
        },
      });
    });

    let voicePipeline: any = null;

    const shutdown = async () => {
      console.log(chalk.dim("\n  stopping..."));
      if (voicePipeline) {
        await voicePipeline.stop();
      }
      await gateway.stop();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    try {
      await gateway.start();
      console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.active} gateway ready`));
      console.log(chalk.dim(`  port: ${gateway.getPort()}`));

      // ── Start voice pipeline ──────────────────────────────────────
      if (opts.voice !== false) {
        try {
          const {
            createVoicePipeline,
            createWakeWordDetector,
            createSTT,
            createTTS,
            createReasoningClient,
            SoundLibrary,
          } = await import("@korvid/voice");

          const wakeWord = createWakeWordDetector(config);
          const stt = createSTT(config);
          const tts = createTTS(config);
          const reasoning = createReasoningClient(config);
          const sounds = new SoundLibrary();

          voicePipeline = createVoicePipeline({
            wakeWord,
            stt,
            reasoning,
            tts,
            sounds: { play: (name: string) => sounds.play(name as any) },
            config: {
              sessionPersist: config.voice.sessionPersist,
              sessionPath: config.voice.sessionPath,
              vad: config.voice.vad,
              vadSilenceMs: config.voice.vadSilenceMs,
            },
          } as any);

          // Wire pipeline state to dashboard via gateway broadcasts
          voicePipeline.on("state", (state: string) => {
            gateway.broadcast({ type: "pipeline_state", state });
          });
          voicePipeline.on("transcript", (text: string) => {
            gateway.broadcast({ type: "partial_transcript", text });
          });
          voicePipeline.on("response", (text: string) => {
            gateway.broadcast({ type: "streaming_token", text, done: true });
          });
          voicePipeline.on("activity", (entry: any) => {
            gateway.broadcast({ type: "activity", entry });
          });

          await voicePipeline.start();
          console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.active} voice pipeline active`));
          console.log(chalk.dim(`  wake word: ${config.voice.wakeWord.engine}`));
          console.log(chalk.dim(`  stt: ${config.voice.stt.provider}`));
          console.log(chalk.dim(`  tts: ${config.voice.tts.provider}`));
        } catch (err) {
          console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} voice pipeline failed to start`));
          console.log(chalk.dim(`  ${err instanceof Error ? err.message : String(err)}`));
          console.log(chalk.dim("  Gateway running without voice. Use --no-voice to suppress this."));
        }
      }

      console.log(chalk.dim("  Ctrl+C to stop.\n"));

      await new Promise<void>((resolve) => {
        gateway.on("stopped", () => resolve());
      });
    } catch (err) {
      console.error(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} failed: ${err instanceof Error ? err.message : err}`));
      process.exit(1);
    }
  });

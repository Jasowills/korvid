import { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "@korvid/shared/config-file.js";
import { createLogger, setLogLevel } from "@korvid/shared/logger.js";
import { createGateway } from "@korvid/gateway";
import { createDelegationLoop } from "@korvid/delegation";
import { brandBoot, STATUS_GLYPH } from "../brand.js";

const log = createLogger("start");

export const startCommand = new Command("start")
  .description("Start the Korvid gateway daemon")
  .option("-d, --detach", "Run in background")
  .option("--port <port>", "Override gateway port", Number)
  .option("--voice", "Also start voice pipeline (default: on)")
  .option("--no-voice", "Disable voice pipeline")
  .option("--debug", "Enable debug logging")
  .action(async (opts) => {
    console.log(brandBoot());

    if (opts.debug) {
      setLogLevel("debug");
    }

    log.info("starting korvid...");

    let config;
    try {
      config = loadConfig();
      log.info("config loaded", {
        reasoning: `${config.models.reasoning.provider}/${config.models.reasoning.model}`,
        stt: config.voice.stt.provider,
        tts: config.voice.tts.provider,
        wakeWord: config.voice.wakeWord.engine,
      });
    } catch (err) {
      log.error("failed to load config", { error: String(err) });
      console.error(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} ${err instanceof Error ? err.message : err}`));
      console.error(chalk.dim('  run "korvid init" to create a config.'));
      process.exit(1);
    }

    if (opts.port) {
      config.gateway.port = opts.port;
    }

    const gateway = createGateway(config);
    log.info("gateway created", { port: config.gateway.port });

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
      log.info("shutting down...");
      console.log(chalk.dim("\n  stopping..."));
      if (voicePipeline) {
        await voicePipeline.stop();
        log.info("voice pipeline stopped");
      }
      await gateway.stop();
      log.info("gateway stopped");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    try {
      await gateway.start();
      log.info("gateway started", { port: gateway.getPort() });
      console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.active} gateway ready`));
      console.log(chalk.dim(`  port: ${gateway.getPort()}`));

      // ── Start voice pipeline ──────────────────────────────────────
      if (opts.voice !== false) {
        try {
          log.info("loading voice modules...");
          const {
            createVoicePipeline,
            createWakeWordDetector,
            createSTT,
            createTTS,
            createReasoningClient,
            SoundLibrary,
          } = await import("@korvid/voice");

          log.info("creating voice components", {
            wakeWord: config.voice.wakeWord.engine,
            stt: config.voice.stt.provider,
            tts: config.voice.tts.provider,
            reasoning: `${config.models.reasoning.provider}/${config.models.reasoning.model}`,
          });

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
            log.debug("pipeline state", { state });
            gateway.broadcast({ type: "pipeline_state", state });
          });
          voicePipeline.on("transcript", (text: string) => {
            log.debug("transcript", { text: text.slice(0, 80) });
            gateway.broadcast({ type: "partial_transcript", text });
          });
          voicePipeline.on("response", (text: string) => {
            log.debug("response", { text: text.slice(0, 80) });
            gateway.broadcast({ type: "streaming_token", text, done: true });
          });
          voicePipeline.on("activity", (entry: any) => {
            log.info("activity", entry);
            gateway.broadcast({ type: "activity", entry });
          });

          await voicePipeline.start();
          log.info("voice pipeline started");
          console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.active} voice pipeline active`));
          console.log(chalk.dim(`  wake word: ${config.voice.wakeWord.engine}`));
          console.log(chalk.dim(`  stt: ${config.voice.stt.provider}`));
          console.log(chalk.dim(`  tts: ${config.voice.tts.provider}`));
        } catch (err) {
          log.error("voice pipeline failed", { error: err instanceof Error ? err.message : String(err) });
          console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} voice pipeline failed to start`));
          console.log(chalk.dim(`  ${err instanceof Error ? err.message : String(err)}`));
          console.log(chalk.dim("  Gateway running without voice. Use --no-voice to suppress this."));
        }
      } else {
        log.info("voice pipeline disabled (--no-voice)");
      }

      console.log(chalk.dim("  Ctrl+C to stop.\n"));

      await new Promise<void>((resolve) => {
        gateway.on("stopped", () => resolve());
      });
    } catch (err) {
      log.error("startup failed", { error: err instanceof Error ? err.message : String(err) });
      console.error(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} failed: ${err instanceof Error ? err.message : err}`));
      process.exit(1);
    }
  });

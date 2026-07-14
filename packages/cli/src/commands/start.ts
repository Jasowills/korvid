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
          log.debug("wake word detector created");
          const stt = createSTT(config);
          log.debug("STT created", { provider: config.voice.stt.provider });
          const tts = createTTS(config);
          log.debug("TTS created", { provider: config.voice.tts.provider });
          const reasoning = createReasoningClient(config);
          log.debug("reasoning client created");
          const sounds = new SoundLibrary();
          log.debug("sound library created");

          // Create tool registry for the pipeline
          const { createDefaultRegistry, toolsToFunctionSchema } = await import("@korvid/tools");
          const toolRegistry = createDefaultRegistry();
          const toolDefs = toolsToFunctionSchema(toolRegistry.list());
          log.info("tools loaded", { count: toolRegistry.list().length });

          // Create clap detector if enabled
          let clapDetector: any = undefined;
          if (config.voice.clapActivation?.enabled) {
            const { createClapDetector } = await import("@korvid/voice");
            clapDetector = createClapDetector({
              clapWindowMs: config.voice.clapActivation.clapWindowMs ?? 700,
              sensitivity: config.voice.clapActivation.sensitivity ?? 0.5,
            });
            log.info("clap detector created", {
              sensitivity: config.voice.clapActivation.sensitivity ?? 0.5,
            });

            // Check for available audio capture tools
            const { spawn, execSync } = await import("node:child_process");
            let hasSox = false;
            let hasFfmpeg = false;
            try { execSync("which sox", { stdio: "ignore" }); hasSox = true; } catch {}
            try { execSync("which ffmpeg", { stdio: "ignore" }); hasFfmpeg = true; } catch {}

            if (!hasSox && !hasFfmpeg) {
              log.warn("no audio capture tool found (install sox or ffmpeg for clap detection)");
              console.log(chalk.dim("  clap detection requires sox or ffmpeg. Install with: brew install sox"));
            } else {
              // Start continuous audio feed to clap detector
              let micProcess: ReturnType<typeof spawn>;

              if (hasSox) {
                micProcess = spawn("sox", [
                  "-d", "-t", "raw", "-r", "16000", "-e", "signed-integer",
                  "-b", "16", "-c", "1", "-",
                ], { stdio: ["ignore", "pipe", "pipe"] });
              } else {
                // ffmpeg fallback for macOS
                micProcess = spawn("ffmpeg", [
                  "-f", "avfoundation", "-i", ":0",
                  "-ar", "16000", "-ac", "1", "-f", "s16le", "-",
                ], { stdio: ["ignore", "pipe", "pipe"] });
              }

              if (micProcess.stdout) {
                micProcess.stdout.on("data", (chunk: Buffer) => {
                  clapDetector.processAudio(chunk);
                });
              }

              micProcess.on("error", (err) => {
                log.warn("mic capture failed for clap detector", { error: err.message });
              });

              log.info("clap detector listening on microphone");
            }
          }

          voicePipeline = createVoicePipeline({
            wakeWord,
            stt,
            reasoning,
            tts,
            sounds: { play: (name: string) => sounds.play(name as any) },
            clapDetector,
            tools: {
              definitions: toolDefs as any,
              execute: async (name: string, args: Record<string, unknown>) => {
                const result = await toolRegistry.execute(name, args, config);
                log.info("tool executed", { name, success: result.result.success });
                return result.result.output || result.result.error || "(no output)";
              },
            },
            config: {
              sessionPersist: config.voice.sessionPersist,
              sessionPath: config.voice.sessionPath,
              vad: config.voice.vad,
              vadSilenceMs: config.voice.vadSilenceMs,
            },
          } as any);
          log.debug("voice pipeline created");

          // Wire pipeline events to dashboard via gateway broadcasts
          voicePipeline.on("pipeline", (event: any) => {
            log.debug("pipeline event", { state: event.state });
            gateway.broadcast({ type: "pipeline", state: event.state });
            if (event.partialTranscript) {
              gateway.broadcast({ type: "partial_transcript", text: event.partialTranscript });
            }
            if (event.streamingToken) {
              gateway.broadcast({ type: "streaming_token", token: event.streamingToken, done: false });
            }
            if (event.transcript && event.response) {
              gateway.broadcast({ type: "activity", entry: {
                id: `act-${Date.now()}`,
                timestamp: Date.now(),
                type: "reasoning",
                message: `User: ${event.transcript}\nKorvid: ${event.response}`,
                status: "completed",
              }});
            }
          });
          voicePipeline.on("state", (state: string) => {
            log.debug("pipeline state", { state });
            gateway.broadcast({ type: "pipeline", state });
          });
          voicePipeline.on("streaming_token", (token: string) => {
            gateway.broadcast({ type: "streaming_token", token, done: false });
          });
          voicePipeline.on("partial_transcript", (text: string) => {
            gateway.broadcast({ type: "partial_transcript", text });
          });

          await voicePipeline.start();
          log.info("voice pipeline started");

          // Speak greeting via TTS on startup
          const { getGreeting } = await import("@korvid/voice");
          const greeting = getGreeting();
          log.info("greeting", { text: greeting });
          console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.active} greeting: "${greeting}"`));

          // Broadcast greeting to dashboard
          gateway.broadcast({ type: "pipeline", state: "idle" });
          gateway.broadcast({ type: "activity", entry: {
            id: `greeting-${Date.now()}`,
            timestamp: Date.now(),
            type: "reasoning",
            message: greeting,
            status: "completed",
          }});

          // Speak the greeting via TTS
          console.log(chalk.dim(`  speaking greeting...`));
          try {
            log.info("speaking greeting via TTS", { provider: config.voice.tts.provider });
            const ttsStart = Date.now();
            await tts.speak(greeting);
            const ttsDuration = Date.now() - ttsStart;
            log.info("greeting spoken successfully", { durationMs: ttsDuration });
            console.log(chalk.dim(`  greeting spoken (${ttsDuration}ms)`));
          } catch (ttsErr) {
            log.error("TTS greeting failed", { error: String(ttsErr), stack: ttsErr instanceof Error ? ttsErr.stack : undefined });
            console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} TTS greeting failed: ${ttsErr}`));
          }

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

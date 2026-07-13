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

    const shutdown = async () => {
      console.log(chalk.dim("\n  stopping..."));
      await gateway.stop();
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    try {
      await gateway.start();
      console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.active} gateway ready`));
      console.log(chalk.dim(`  port: ${gateway.getPort()}`));
      console.log(chalk.dim("  Ctrl+C to stop.\n"));

      await new Promise<void>((resolve) => {
        gateway.on("stopped", () => resolve());
      });
    } catch (err) {
      console.error(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} failed: ${err instanceof Error ? err.message : err}`));
      process.exit(1);
    }
  });

#!/usr/bin/env node

import { Command } from "commander";
import { brandBoot, brandFooter } from "./brand.js";
import { initCommand } from "./commands/init.js";
import { startCommand } from "./commands/start.js";
import { statusCommand } from "./commands/status.js";
import { voiceCommand } from "./commands/voice.js";
import { delegateCommand } from "./commands/delegate.js";
import { toolsCommand } from "./commands/tools.js";
import { messagingCommand } from "./commands/messaging.js";
import { visionCommand } from "./commands/vision.js";
import { memoryCommand } from "./commands/memory.js";
import { doctorCommand } from "./commands/doctor.js";
import { modelsCommand } from "./commands/models.js";
import { configExists, loadConfig } from "@korvid/shared/config-file.js";

const program = new Command();

program
  .name("korvid")
  .description("personal ai assistant")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(startCommand);
program.addCommand(statusCommand);
program.addCommand(voiceCommand);
program.addCommand(delegateCommand);
program.addCommand(toolsCommand);
program.addCommand(messagingCommand);
program.addCommand(visionCommand);
program.addCommand(memoryCommand);
program.addCommand(doctorCommand);
program.addCommand(modelsCommand);

// ── Bare command routing ──────────────────────────────────────────
const args = process.argv.slice(2);
const hasSubcommand = args.length > 0 && !args[0].startsWith("-");

if (!hasSubcommand) {
  // No subcommand — route based on config state
  if (args.includes("--help") || args.includes("-h")) {
    console.log(brandBoot());
    console.log(brandFooter());
    console.log("");
    program.help();
  } else if (!configExists()) {
    // No config → run init
    console.log(brandBoot());
    program.parseAsync(["node", "korvid", "init"]);
  } else {
    try {
      const config = loadConfig();
      // Config exists and valid → show brand + hint
      console.log(brandBoot());
      console.log(brandFooter());
      console.log("");
      console.log("  Korvid is configured.");
      console.log("");
      console.log("  Quick start:");
      console.log("    korvid voice    — start talking");
      console.log("    korvid doctor   — check system");
      console.log("    korvid models   — manage models");
      console.log("");
    } catch {
      // Config invalid → run doctor
      console.log(brandBoot());
      program.parseAsync(["node", "korvid", "doctor"]);
    }
  }
} else {
  program.parse();
}

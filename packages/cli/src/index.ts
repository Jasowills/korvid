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

const program = new Command();

const args = process.argv.slice(2);
const isHelp = args.includes("--help") || args.includes("-h") || args.length === 0;

if (isHelp) {
  console.log(brandBoot());
  console.log(brandFooter());
  console.log("");
}

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

program.parse();

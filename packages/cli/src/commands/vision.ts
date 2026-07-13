import { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "@korvid/shared/config-file.js";
import { createDefaultVision } from "@korvid/vision";
import { STATUS_GLYPH } from "../brand.js";

export const visionCommand = new Command("vision")
  .description("Capture and analyze screenshots")
  .option("--capture", "Capture a screenshot")
  .option("--analyze <path>", "Analyze an image file")
  .option("--ocr <path>", "Extract text from an image")
  .option("--prompt <text>", "Custom prompt for analysis")
  .action(async (opts) => {
    console.log(chalk.dim("\n  vision\n"));

    let config;
    try {
      config = loadConfig();
    } catch (err) {
      console.error(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} ${err instanceof Error ? err.message : err}`));
      process.exit(1);
    }

    const vision = createDefaultVision(config);

    if (opts.capture) {
      console.log(chalk.dim("  capturing..."));
      const result = await vision.captureScreen();
      if (result.success) {
        console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.active} ${result.imagePath}`));
      } else {
        console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} ${result.error}`));
      }
    }

    if (opts.analyze) {
      console.log(chalk.dim(`  analyzing ${opts.analyze}...`));
      const result = await vision.analyzeImage(opts.analyze, opts.prompt);
      if (result.success) {
        console.log(chalk.hex("#7C8CFF")(`  ${result.description}`));
      } else {
        console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} ${result.error}`));
      }
    }

    if (opts.ocr) {
      console.log(chalk.dim(`  extracting text from ${opts.ocr}...`));
      const result = await vision.ocr(opts.ocr);
      if (result.success) {
        console.log(chalk.hex("#7C8CFF")(`  ${result.text}`));
      } else {
        console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} ${result.error}`));
      }
    }

    if (!opts.capture && !opts.analyze && !opts.ocr) {
      console.log(chalk.dim("  usage: korvid vision --capture | --analyze <path> | --ocr <path>"));
    }

    console.log();
  });

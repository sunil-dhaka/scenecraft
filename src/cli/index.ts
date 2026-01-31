#!/usr/bin/env node

import { Command } from "commander";
import { generate, generateInteractive } from "./commands/generate.js";
import { setup } from "./commands/setup.js";
import { printBanner } from "./ui.js";
import { configExists } from "../config/loader.js";

const program = new Command();

program
  .name("scenecraft")
  .description("Generate cinematic video prompts from text, books, and images")
  .version("0.1.0");

program
  .command("setup")
  .description("Configure SceneCraft with your API key and preferences")
  .action(setup);

program
  .command("generate")
  .description("Generate video prompts from input")
  .option("-f, --file <path>", "Input file (txt, md, pdf, epub, jpg, png)")
  .option("-t, --text <text>", "Direct text input")
  .option("-s, --scenes <count>", "Number of scenes to generate (1-20)")
  .option("--style <style>", "Visual style: cinematic, documentary, artistic, minimal")
  .option("-o, --output <path>", "Save output to file")
  .option("--format <format>", "Output format: text, json, markdown")
  .option("-i, --interactive", "Interactive mode with copy support")
  .option("--dialogue", "Include dialogue in prompts")
  .option("--no-camera", "Exclude camera movements")
  .option("--no-lighting", "Exclude lighting descriptions")
  .option("--no-mood", "Exclude mood/emotion")
  .action(generate);

// Default command (no subcommand) - run interactive mode
program
  .action(async () => {
    if (!configExists()) {
      printBanner();
      console.log("  Welcome! Let's set up SceneCraft first.\n");
      await setup();
    } else {
      await generateInteractive();
    }
  });

program.parse();

import * as p from "@clack/prompts";
import chalk from "chalk";
import clipboard from "clipboardy";
import type { VideoScene, GenerationResult } from "../core/generator.js";

export function printBanner(): void {
  console.log();
  console.log(chalk.bold.cyan(`
   ___                    ___            __ _
  / __| __ ___ _ _  ___  / __|_ _ __ _ / _| |_
  \\__ \\/ _/ -_) ' \\/ -_)| (__| '_/ _\` |  _|  _|
  |___/\\__\\___|_||_\\___| \\___|_| \\__,_|_|  \\__|
  `));
  console.log(chalk.gray("  Craft cinematic video prompts from any content\n"));
}

export function printScene(scene: VideoScene, index: number, total: number): void {
  const header = chalk.bold.magenta(`\n[${index + 1}/${total}] ${scene.title}`);
  const duration = chalk.dim(`(${scene.duration})`);

  console.log(`${header} ${duration}`);
  console.log(chalk.white(scene.prompt));

  if (scene.camera) {
    console.log(chalk.yellow(`  Camera: ${scene.camera}`));
  }
  if (scene.lighting) {
    console.log(chalk.blue(`  Lighting: ${scene.lighting}`));
  }
  if (scene.mood) {
    console.log(chalk.green(`  Mood: ${scene.mood}`));
  }
  if (scene.dialogue) {
    console.log(chalk.cyan(`  Dialogue: "${scene.dialogue}"`));
  }
}

export function printSummary(result: GenerationResult): void {
  console.log();
  console.log(chalk.bold.white("Summary:"), result.summary);
  console.log(chalk.bold.white("Style:"), result.style);
  console.log(chalk.bold.white("Scenes:"), result.scenes.length);
}

export async function interactiveSceneViewer(result: GenerationResult): Promise<void> {
  printSummary(result);
  console.log();

  p.note(
    "Use arrow keys to navigate, Enter to copy prompt, Q to quit",
    "Interactive Mode"
  );

  let currentIndex = 0;
  const scenes = result.scenes;

  const showCurrentScene = (): void => {
    console.clear();
    printBanner();
    printSummary(result);
    console.log(chalk.dim("\n─".repeat(60)));
    printScene(scenes[currentIndex], currentIndex, scenes.length);
    console.log(chalk.dim("─".repeat(60)));
    console.log();
    console.log(chalk.dim("  [<-] Previous  [->] Next  [C] Copy  [A] Copy All  [Q] Quit"));
  };

  showCurrentScene();

  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  return new Promise((resolve) => {
    process.stdin.on("data", async (key) => {
      const keyStr = key.toString();

      if (keyStr === "\u001b[D" || keyStr === "h") {
        // Left arrow or h
        currentIndex = Math.max(0, currentIndex - 1);
        showCurrentScene();
      } else if (keyStr === "\u001b[C" || keyStr === "l") {
        // Right arrow or l
        currentIndex = Math.min(scenes.length - 1, currentIndex + 1);
        showCurrentScene();
      } else if (keyStr.toLowerCase() === "c") {
        // Copy current prompt
        await clipboard.write(scenes[currentIndex].prompt);
        console.log(chalk.green("\n  Copied to clipboard!"));
        setTimeout(showCurrentScene, 800);
      } else if (keyStr.toLowerCase() === "a") {
        // Copy all prompts
        const allPrompts = scenes.map((s, i) =>
          `[Scene ${i + 1}] ${s.title}\n${s.prompt}`
        ).join("\n\n---\n\n");
        await clipboard.write(allPrompts);
        console.log(chalk.green("\n  All prompts copied to clipboard!"));
        setTimeout(showCurrentScene, 800);
      } else if (keyStr === "q" || keyStr === "\u0003") {
        // Q or Ctrl+C
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        rl.close();
        console.log();
        resolve();
      }
    });
  });
}

export async function selectableSceneList(result: GenerationResult): Promise<void> {
  printSummary(result);
  console.log();

  const choices = result.scenes.map((scene, i) => ({
    value: i,
    label: `Scene ${scene.sceneNumber}: ${scene.title}`,
    hint: scene.duration,
  }));

  while (true) {
    const selected = await p.select({
      message: "Select a scene to copy (Ctrl+C to exit)",
      options: [
        ...choices,
        { value: -1, label: "Copy all prompts", hint: "All scenes" },
        { value: -2, label: "Exit", hint: "" },
      ],
    });

    if (p.isCancel(selected) || selected === -2) {
      break;
    }

    if (selected === -1) {
      const allPrompts = result.scenes.map((s, i) =>
        `[Scene ${i + 1}] ${s.title}\n${s.prompt}`
      ).join("\n\n---\n\n");
      await clipboard.write(allPrompts);
      p.log.success("All prompts copied to clipboard!");
    } else {
      const scene = result.scenes[selected as number];
      await clipboard.write(scene.prompt);
      p.log.success(`Scene ${scene.sceneNumber} prompt copied!`);

      console.log();
      printScene(scene, selected as number, result.scenes.length);
      console.log();
    }
  }
}

export function printError(message: string): void {
  console.log(chalk.red(`\nError: ${message}\n`));
}

export function printSuccess(message: string): void {
  console.log(chalk.green(`\n${message}\n`));
}

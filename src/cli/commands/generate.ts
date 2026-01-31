import { existsSync, writeFileSync } from "node:fs";
import * as p from "@clack/prompts";
import ora from "ora";
import { loadConfig } from "../../config/loader.js";
import { STYLE_OPTIONS, type SceneCraftConfig } from "../../config/schema.js";
import { initializeClient } from "../../services/gemini.js";
import { parseFile, readImageAsBase64, isImageFile, isTextFile } from "../../utils/parsers.js";
import {
  generateFromText,
  generateFromImage,
  formatAllScenes,
  type GenerationResult,
} from "../../core/generator.js";
import {
  printBanner,
  printError,
  interactiveSceneViewer,
  selectableSceneList,
} from "../ui.js";

interface GenerateOptions {
  file?: string;
  text?: string;
  scenes?: string;
  style?: string;
  output?: string;
  format?: string;
  interactive?: boolean;
  dialogue?: boolean;
  noCamera?: boolean;
  noLighting?: boolean;
  noMood?: boolean;
}

export async function generate(options: GenerateOptions): Promise<void> {
  const config = await loadConfig();

  if (!config) {
    printError("No configuration found. Run 'scenecraft setup' first.");
    process.exit(1);
  }

  initializeClient(config.apiKey);

  // Determine input source
  let inputText: string | null = null;
  let imageData: { data: string; mimeType: string } | null = null;
  let inputName = "input";

  if (options.file) {
    if (!existsSync(options.file)) {
      printError(`File not found: ${options.file}`);
      process.exit(1);
    }

    if (isImageFile(options.file)) {
      imageData = readImageAsBase64(options.file);
      inputName = options.file;
    } else if (isTextFile(options.file)) {
      inputText = await parseFile(options.file);
      inputName = options.file;
    } else {
      printError("Unsupported file format. Use: txt, md, pdf, epub, jpg, png, gif, webp");
      process.exit(1);
    }
  } else if (options.text) {
    inputText = options.text;
    inputName = "text input";
  }

  // Build generation config
  const genConfig: SceneCraftConfig = {
    ...config,
    sceneCount: options.scenes ? parseInt(options.scenes, 10) : config.sceneCount,
    style: (options.style as SceneCraftConfig["style"]) ?? config.style,
    includeDialogue: options.dialogue ?? config.includeDialogue,
    includeCamera: options.noCamera ? false : config.includeCamera,
    includeLighting: options.noLighting ? false : config.includeLighting,
    includeMood: options.noMood ? false : config.includeMood,
    outputFormat: (options.format as SceneCraftConfig["outputFormat"]) ?? config.outputFormat,
  };

  // Generate scenes
  const spinner = ora(`Generating ${genConfig.sceneCount} scenes from ${inputName}...`).start();

  let result: GenerationResult;

  try {
    if (imageData) {
      result = await generateFromImage(imageData.data, imageData.mimeType, genConfig);
    } else if (inputText) {
      result = await generateFromText(inputText, genConfig);
    } else {
      spinner.fail("No input provided");
      process.exit(1);
    }

    spinner.succeed(`Generated ${result.scenes.length} scenes`);
  } catch (error) {
    spinner.fail("Generation failed");
    printError(error instanceof Error ? error.message : "Unknown error");
    process.exit(1);
  }

  // Output handling
  if (options.output) {
    const formatted = formatAllScenes(result, genConfig.outputFormat);
    writeFileSync(options.output, formatted);
    console.log(`\nSaved to: ${options.output}`);
  }

  // Interactive mode
  if (options.interactive) {
    await selectableSceneList(result);
  } else if (process.stdout.isTTY && !options.output) {
    // Default to interactive if TTY and no output file
    await interactiveSceneViewer(result);
  } else {
    // Non-interactive output
    console.log(formatAllScenes(result, genConfig.outputFormat));
  }
}

export async function generateInteractive(): Promise<void> {
  printBanner();

  const config = await loadConfig();

  if (!config) {
    printError("No configuration found. Run 'scenecraft setup' first.");
    process.exit(1);
  }

  p.intro("Generate cinematic video prompts");

  // Input type selection
  const inputType = await p.select({
    message: "What would you like to transform into video prompts?",
    options: [
      { value: "file", label: "File", hint: "txt, md, pdf, epub, jpg, png" },
      { value: "text", label: "Text", hint: "Paste or type directly" },
    ],
  });

  if (p.isCancel(inputType)) {
    p.cancel("Cancelled");
    return;
  }

  let inputText: string | null = null;
  let imageData: { data: string; mimeType: string } | null = null;

  if (inputType === "file") {
    const filePath = await p.text({
      message: "Enter the file path:",
      validate: (value) => {
        if (!value) return "File path is required";
        if (!existsSync(value)) return "File not found";
        if (!isImageFile(value) && !isTextFile(value)) {
          return "Unsupported file format";
        }
      },
    });

    if (p.isCancel(filePath)) {
      p.cancel("Cancelled");
      return;
    }

    if (isImageFile(filePath)) {
      imageData = readImageAsBase64(filePath);
    } else {
      const spinner = ora("Reading file...").start();
      inputText = await parseFile(filePath);
      spinner.succeed(`Read ${inputText.length} characters`);
    }
  } else {
    const text = await p.text({
      message: "Enter or paste your text:",
      placeholder: "Once upon a time...",
      validate: (value) => {
        if (!value || value.length < 10) return "Please enter at least 10 characters";
      },
    });

    if (p.isCancel(text)) {
      p.cancel("Cancelled");
      return;
    }

    inputText = text;
  }

  // Scene count
  const sceneCount = await p.text({
    message: "How many scenes?",
    placeholder: "5",
    defaultValue: "5",
    validate: (value) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1 || num > 20) {
        return "Enter a number between 1 and 20";
      }
    },
  });

  if (p.isCancel(sceneCount)) {
    p.cancel("Cancelled");
    return;
  }

  // Style selection
  const style = await p.select({
    message: "Choose a visual style:",
    options: STYLE_OPTIONS.map((s) => ({
      value: s.value,
      label: s.label,
      hint: s.description,
    })),
  });

  if (p.isCancel(style)) {
    p.cancel("Cancelled");
    return;
  }

  // Additional options
  const extras = await p.multiselect({
    message: "Include in prompts:",
    options: [
      { value: "camera", label: "Camera movements", hint: "Pan, zoom, dolly, etc." },
      { value: "lighting", label: "Lighting", hint: "Mood lighting descriptions" },
      { value: "mood", label: "Mood/Emotion", hint: "Emotional tone" },
      { value: "dialogue", label: "Dialogue", hint: "Character speech" },
    ],
    initialValues: ["camera", "lighting", "mood"],
  });

  if (p.isCancel(extras)) {
    p.cancel("Cancelled");
    return;
  }

  initializeClient(config.apiKey);

  const genConfig: SceneCraftConfig = {
    ...config,
    sceneCount: parseInt(sceneCount, 10),
    style: style as SceneCraftConfig["style"],
    includeCamera: extras.includes("camera"),
    includeLighting: extras.includes("lighting"),
    includeMood: extras.includes("mood"),
    includeDialogue: extras.includes("dialogue"),
  };

  const spinner = ora("Generating cinematic scenes...").start();

  let result: GenerationResult;

  try {
    if (imageData) {
      result = await generateFromImage(imageData.data, imageData.mimeType, genConfig);
    } else if (inputText) {
      result = await generateFromText(inputText, genConfig);
    } else {
      spinner.fail("No input");
      return;
    }

    spinner.succeed(`Generated ${result.scenes.length} scenes!`);
  } catch (error) {
    spinner.fail("Generation failed");
    printError(error instanceof Error ? error.message : "Unknown error");
    return;
  }

  // Show results with interactive selection
  await selectableSceneList(result);

  p.outro("Happy creating!");
}

import * as p from "@clack/prompts";
import ora from "ora";
import { configExists, saveConfig, getConfigPath } from "../../config/loader.js";
import { MODEL_OPTIONS, STYLE_OPTIONS, type SceneCraftConfig } from "../../config/schema.js";
import { validateApiKey } from "../../services/gemini.js";
import { printBanner } from "../ui.js";

export async function setup(): Promise<void> {
  printBanner();

  p.intro("Let's set up SceneCraft");

  if (configExists()) {
    const overwrite = await p.confirm({
      message: "Configuration already exists. Overwrite?",
      initialValue: false,
    });

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel("Setup cancelled");
      return;
    }
  }

  // API Key
  const apiKey = await p.text({
    message: "Enter your Google Gemini API key:",
    placeholder: "AIza...",
    validate: (value) => {
      if (!value || value.length < 10) {
        return "Please enter a valid API key";
      }
    },
  });

  if (p.isCancel(apiKey)) {
    p.cancel("Setup cancelled");
    return;
  }

  // Validate API key
  const spinner = ora("Validating API key...").start();
  const isValid = await validateApiKey(apiKey);

  if (!isValid) {
    spinner.fail("Invalid API key");
    p.cancel("Please check your API key and try again");
    return;
  }

  spinner.succeed("API key validated");

  // Model selection
  const model = await p.select({
    message: "Choose your preferred AI model:",
    options: MODEL_OPTIONS.map((m) => ({
      value: m.value,
      label: m.label,
      hint: m.description,
    })),
  });

  if (p.isCancel(model)) {
    p.cancel("Setup cancelled");
    return;
  }

  // Default style
  const style = await p.select({
    message: "Choose your default visual style:",
    options: STYLE_OPTIONS.map((s) => ({
      value: s.value,
      label: s.label,
      hint: s.description,
    })),
  });

  if (p.isCancel(style)) {
    p.cancel("Setup cancelled");
    return;
  }

  // Default scene count
  const sceneCount = await p.text({
    message: "Default number of scenes to generate:",
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
    p.cancel("Setup cancelled");
    return;
  }

  // Default prompt elements
  const elements = await p.multiselect({
    message: "Include by default in prompts:",
    options: [
      { value: "camera", label: "Camera movements", hint: "Pan, zoom, tracking" },
      { value: "lighting", label: "Lighting setup", hint: "Mood and atmosphere" },
      { value: "mood", label: "Emotional tone", hint: "Scene feeling" },
      { value: "dialogue", label: "Dialogue/Voiceover", hint: "Character speech" },
    ],
    initialValues: ["camera", "lighting", "mood"],
  });

  if (p.isCancel(elements)) {
    p.cancel("Setup cancelled");
    return;
  }

  // Save configuration
  const config: Partial<SceneCraftConfig> = {
    apiKey,
    model: model as string,
    style: style as SceneCraftConfig["style"],
    sceneCount: parseInt(sceneCount, 10),
    includeCamera: elements.includes("camera"),
    includeLighting: elements.includes("lighting"),
    includeMood: elements.includes("mood"),
    includeDialogue: elements.includes("dialogue"),
  };

  saveConfig(config);

  p.note(`Configuration saved to:\n${getConfigPath()}`, "Success");

  p.outro("Ready! Run 'scenecraft' to start generating prompts.");
}

import { generateJsonContent, generateContentWithImage } from "../services/gemini.js";
import type { SceneCraftConfig } from "../config/schema.js";

export interface VideoScene {
  sceneNumber: number;
  title: string;
  prompt: string;
  duration: string;
  camera?: string;
  lighting?: string;
  mood?: string;
  dialogue?: string;
}

export interface GenerationResult {
  scenes: VideoScene[];
  summary: string;
  style: string;
}

function buildPrompt(config: SceneCraftConfig, inputType: "text" | "image"): string {
  const styleDescriptions: Record<string, string> = {
    cinematic: "Hollywood blockbuster style with dramatic angles, epic scale, and emotional depth",
    documentary: "Realistic, observational style with natural lighting and authentic moments",
    artistic: "Abstract, visually striking with bold colors, unique compositions, and metaphorical imagery",
    minimal: "Clean, focused scenes with simple backgrounds and clear subjects",
  };

  const elements: string[] = [];
  if (config.includeCamera) elements.push("camera movements and angles");
  if (config.includeLighting) elements.push("lighting setup and mood");
  if (config.includeMood) elements.push("emotional tone and atmosphere");
  if (config.includeDialogue) elements.push("character dialogue or voiceover");

  const elementsText = elements.length > 0
    ? `For each scene, include: ${elements.join(", ")}.`
    : "";

  if (inputType === "image") {
    return `
You are a master cinematographer and video director. Analyze this image and create ${config.sceneCount} video scene prompts that bring it to life.

Style: ${styleDescriptions[config.style]}

${elementsText}

Each scene should be 5-15 seconds long and optimized for AI video generation (Veo, Runway, etc).

Return a JSON object with:
{
  "summary": "Brief description of the visual narrative",
  "style": "${config.style}",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Scene title",
      "prompt": "Detailed video generation prompt (50+ words)",
      "duration": "5-10 seconds"${config.includeCamera ? ',\n      "camera": "Camera movement description"' : ''}${config.includeLighting ? ',\n      "lighting": "Lighting description"' : ''}${config.includeMood ? ',\n      "mood": "Emotional tone"' : ''}${config.includeDialogue ? ',\n      "dialogue": "Spoken text or voiceover"' : ''}
    }
  ]
}

Create scenes that would work as a cohesive short film or video sequence.
`.trim();
  }

  return `
You are a master cinematographer and video director. Transform this text into ${config.sceneCount} cinematic video scene prompts.

Style: ${styleDescriptions[config.style]}

${elementsText}

Each scene should be 5-15 seconds long and optimized for AI video generation (Veo, Runway, etc).

Return a JSON object with:
{
  "summary": "Brief summary of the story/content",
  "style": "${config.style}",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Scene title",
      "prompt": "Detailed video generation prompt (50+ words). Be specific about: subjects, actions, environment, colors, textures, movement.",
      "duration": "5-10 seconds"${config.includeCamera ? ',\n      "camera": "Camera movement (dolly, pan, zoom, tracking, etc.)"' : ''}${config.includeLighting ? ',\n      "lighting": "Lighting setup (golden hour, dramatic shadows, neon, etc.)"' : ''}${config.includeMood ? ',\n      "mood": "Emotional tone (tense, joyful, mysterious, etc.)"' : ''}${config.includeDialogue ? ',\n      "dialogue": "Character speech or narrator voiceover"' : ''}
    }
  ]
}

Guidelines:
- Each prompt should be self-contained and generate a complete scene
- Use vivid, specific language for visual details
- Consider scene-to-scene flow for a cohesive narrative
- Include motion and action, not static descriptions
`.trim();
}

export async function generateFromText(
  text: string,
  config: SceneCraftConfig
): Promise<GenerationResult> {
  const prompt = buildPrompt(config, "text");
  const textSample = text.slice(0, 25000);

  const fullPrompt = `${prompt}\n\nSource text:\n---\n${textSample}\n---`;

  const result = await generateJsonContent<GenerationResult>(
    config.model,
    fullPrompt
  );

  if (!result || !result.scenes) {
    throw new Error("Failed to generate scenes");
  }

  return result;
}

export async function generateFromImage(
  imageData: string,
  mimeType: string,
  config: SceneCraftConfig
): Promise<GenerationResult> {
  const prompt = buildPrompt(config, "image");

  const response = await generateContentWithImage(
    config.model,
    prompt,
    imageData,
    mimeType
  );

  try {
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : response;
    return JSON.parse(jsonStr) as GenerationResult;
  } catch {
    throw new Error("Failed to parse scene generation response");
  }
}

export function formatScene(scene: VideoScene, format: "text" | "markdown" | "json"): string {
  if (format === "json") {
    return JSON.stringify(scene, null, 2);
  }

  if (format === "markdown") {
    let md = `### Scene ${scene.sceneNumber}: ${scene.title}\n\n`;
    md += `**Prompt:**\n${scene.prompt}\n\n`;
    md += `**Duration:** ${scene.duration}\n`;
    if (scene.camera) md += `**Camera:** ${scene.camera}\n`;
    if (scene.lighting) md += `**Lighting:** ${scene.lighting}\n`;
    if (scene.mood) md += `**Mood:** ${scene.mood}\n`;
    if (scene.dialogue) md += `**Dialogue:** "${scene.dialogue}"\n`;
    return md;
  }

  // Plain text
  let text = `[Scene ${scene.sceneNumber}] ${scene.title}\n`;
  text += `${scene.prompt}\n`;
  text += `Duration: ${scene.duration}`;
  if (scene.camera) text += ` | Camera: ${scene.camera}`;
  if (scene.lighting) text += ` | Lighting: ${scene.lighting}`;
  if (scene.mood) text += ` | Mood: ${scene.mood}`;
  if (scene.dialogue) text += `\nDialogue: "${scene.dialogue}"`;
  return text;
}

export function formatAllScenes(result: GenerationResult, format: "text" | "markdown" | "json"): string {
  if (format === "json") {
    return JSON.stringify(result, null, 2);
  }

  const header = format === "markdown"
    ? `# Video Scene Prompts\n\n**Summary:** ${result.summary}\n**Style:** ${result.style}\n\n---\n\n`
    : `=== Video Scene Prompts ===\nSummary: ${result.summary}\nStyle: ${result.style}\n\n`;

  const scenes = result.scenes.map((s) => formatScene(s, format)).join("\n\n");

  return header + scenes;
}

import { z } from "zod";

export const configSchema = z.object({
  apiKey: z.string().min(1, "API key is required"),
  model: z.string().default("gemini-3-pro-preview"),
  sceneCount: z.number().min(1).max(20).default(5),
  style: z.enum(["cinematic", "documentary", "artistic", "minimal"]).default("cinematic"),
  includeDialogue: z.boolean().default(false),
  includeCamera: z.boolean().default(true),
  includeLighting: z.boolean().default(true),
  includeMood: z.boolean().default(true),
  outputFormat: z.enum(["text", "json", "markdown"]).default("text"),
});

export type SceneCraftConfig = z.infer<typeof configSchema>;

export const MODEL_OPTIONS = [
  {
    value: "gemini-3-pro-preview",
    label: "Gemini 3 Pro Preview",
    description: "Latest and most capable (Recommended)",
  },
  {
    value: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    description: "Enhanced reasoning and creativity",
  },
  {
    value: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    description: "Fast and efficient",
  },
];

export const STYLE_OPTIONS = [
  {
    value: "cinematic",
    label: "Cinematic",
    description: "Hollywood-style dramatic scenes",
  },
  {
    value: "documentary",
    label: "Documentary",
    description: "Realistic, informative style",
  },
  {
    value: "artistic",
    label: "Artistic",
    description: "Abstract, visually striking",
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Simple, focused prompts",
  },
];

export const defaultConfig: Partial<SceneCraftConfig> = {
  model: "gemini-3-pro-preview",
  sceneCount: 5,
  style: "cinematic",
  includeDialogue: false,
  includeCamera: true,
  includeLighting: true,
  includeMood: true,
  outputFormat: "text",
};

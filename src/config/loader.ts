import { cosmiconfig } from "cosmiconfig";
import { existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { configSchema, defaultConfig, type SceneCraftConfig } from "./schema.js";

const CONFIG_NAME = "scenecraft";
const CONFIG_PATH = join(homedir(), ".scenecraftrc");

const explorer = cosmiconfig(CONFIG_NAME, {
  searchPlaces: [
    `.${CONFIG_NAME}rc`,
    `.${CONFIG_NAME}rc.json`,
    `${CONFIG_NAME}.config.js`,
  ],
});

export function configExists(): boolean {
  return existsSync(CONFIG_PATH);
}

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export async function loadConfig(): Promise<SceneCraftConfig | null> {
  try {
    const result = await explorer.search(homedir());

    if (!result || !result.config) {
      return null;
    }

    const parsed = configSchema.safeParse({
      ...defaultConfig,
      ...result.config,
    });

    if (!parsed.success) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

export function saveConfig(config: Partial<SceneCraftConfig>): void {
  const fullConfig = { ...defaultConfig, ...config };
  writeFileSync(CONFIG_PATH, JSON.stringify(fullConfig, null, 2));
}

export async function getApiKey(): Promise<string | null> {
  const config = await loadConfig();
  return config?.apiKey ?? null;
}

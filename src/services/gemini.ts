import { GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function initializeClient(apiKey: string): void {
  client = new GoogleGenAI({ apiKey });
}

export function getClient(): GoogleGenAI {
  if (!client) {
    throw new Error("Gemini client not initialized. Call initializeClient first.");
  }
  return client;
}

export async function generateContent(
  model: string,
  prompt: string
): Promise<string> {
  const genai = getClient();
  const response = await genai.models.generateContent({
    model,
    contents: prompt,
  });
  return response.text ?? "";
}

export async function generateContentWithImage(
  model: string,
  prompt: string,
  imageData: string,
  mimeType: string
): Promise<string> {
  const genai = getClient();
  const response = await genai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: imageData,
              mimeType,
            },
          },
        ],
      },
    ],
  });
  return response.text ?? "";
}

export async function generateJsonContent<T>(
  model: string,
  prompt: string
): Promise<T | null> {
  const genai = getClient();
  const response = await genai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text;
  if (!text) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim()) as T;
    }
    return JSON.parse(text) as T;
  }
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  try {
    const tempClient = new GoogleGenAI({ apiKey });
    await tempClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Say hello",
    });
    return true;
  } catch {
    return false;
  }
}

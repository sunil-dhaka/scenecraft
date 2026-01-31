import { readFileSync } from "node:fs";
import { extname } from "node:path";

export async function parseFile(filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase();

  switch (ext) {
    case ".txt":
    case ".md":
      return readFileSync(filePath, "utf-8");

    case ".pdf":
      return parsePdf(filePath);

    case ".epub":
      return parseEpub(filePath);

    default:
      throw new Error(`Unsupported file format: ${ext}`);
  }
}

async function parsePdf(filePath: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfParseModule = await import("pdf-parse") as any;
  const pdfParse = pdfParseModule.default ?? pdfParseModule;
  const buffer = readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

async function parseEpub(filePath: string): Promise<string> {
  const { EPub } = await import("epub2");

  return new Promise((resolve, reject) => {
    const epub = new EPub(filePath);

    epub.on("end", async () => {
      try {
        const chapters: string[] = [];

        for (const chapter of epub.flow) {
          const chapterId = chapter.id;
          if (chapterId) {
            const text = await new Promise<string>((res) => {
              epub.getChapter(chapterId, (err: Error, text?: string) => {
                if (err || !text) {
                  res("");
                  return;
                }
                const cleaned = text
                  .replace(/<[^>]*>/g, " ")
                  .replace(/\s+/g, " ")
                  .trim();
                res(cleaned);
              });
            });
            if (text) chapters.push(text);
          }
        }

        resolve(chapters.join("\n\n"));
      } catch (err) {
        reject(err);
      }
    });

    epub.on("error", reject);
    epub.parse();
  });
}

export function readImageAsBase64(filePath: string): { data: string; mimeType: string } {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".webp": "image/webp",
  };

  const mimeType = mimeTypes[ext];
  if (!mimeType) {
    throw new Error(`Unsupported image format: ${ext}`);
  }

  const buffer = readFileSync(filePath);
  const data = buffer.toString("base64");

  return { data, mimeType };
}

export function isImageFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return [".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext);
}

export function isTextFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return [".txt", ".md", ".pdf", ".epub"].includes(ext);
}

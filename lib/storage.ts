import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const CARDS_DIR = path.join(process.cwd(), "public", "cards");

/**
 * Initialize the cards storage directory
 * Creates /public/cards/ if it doesn't exist
 */
export async function initializeStorage(): Promise<void> {
  try {
    if (!existsSync(CARDS_DIR)) {
      await mkdir(CARDS_DIR, { recursive: true });
      console.log(`Created cards directory at ${CARDS_DIR}`);
    }
  } catch (error) {
    console.error("Error initializing storage:", error);
    throw new Error("Failed to initialize storage directory");
  }
}

/**
 * Save a card image to local filesystem
 * @param certNumber - PSA certification number (used as filename)
 * @param imageData - Base64 encoded image data (with data:image/xxx;base64, prefix)
 * @returns The relative path to the saved image (e.g., /cards/12345678.jpg)
 */
export async function saveCardImage(
  certNumber: string,
  imageData: string
): Promise<string> {
  try {
    // Ensure storage directory exists
    await initializeStorage();

    // Extract the actual base64 data and mime type
    const matches = imageData.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      throw new Error("Invalid image data format");
    }

    const extension = matches[1]; // jpg, png, webp, etc.
    const base64Data = matches[2];

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Create filename: certNumber.extension
    const filename = `${certNumber}.${extension}`;
    const filepath = path.join(CARDS_DIR, filename);

    // Save the image
    await writeFile(filepath, imageBuffer);

    // Return the public URL path (relative to /public)
    const relativePath = `/cards/${filename}`;

    console.log(`Saved card image: ${relativePath}`);

    return relativePath;
  } catch (error) {
    console.error("Error saving card image:", error);
    throw new Error("Failed to save card image");
  }
}

/**
 * Convert base64 image data to Buffer
 * Useful for generating embeddings
 */
export function base64ToBuffer(imageData: string): Buffer {
  try {
    const matches = imageData.match(/^data:image\/\w+;base64,(.+)$/);
    if (!matches) {
      throw new Error("Invalid image data format");
    }

    const base64Data = matches[1];
    return Buffer.from(base64Data, "base64");
  } catch (error) {
    console.error("Error converting base64 to buffer:", error);
    throw new Error("Failed to convert image data");
  }
}

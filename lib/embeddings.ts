import { embed } from "ai";
import { google } from "@ai-sdk/google";
import sharp from "sharp";
import { PSACard } from "@/types/types";

const IMAGE_EMBED_WIDTH = 32;
const IMAGE_EMBED_HEIGHT = 16;
const IMAGE_EMBED_DIMS = IMAGE_EMBED_WIDTH * IMAGE_EMBED_HEIGHT; // 512 dims

function normalizeVector(values: number[]): number[] {
  const norm =
    Math.sqrt(values.reduce((sum, value) => sum + value * value, 0)) || 1;
  return values.map((value) => value / norm);
}

/**
 * Generate text embedding using Google Gemini text-embedding-004
 * Converts PSA card metadata into a searchable text embedding (768 dimensions)
 */
export async function generateTextEmbedding(card: PSACard): Promise<number[]> {
  try {
    // Create a rich text representation of the card
    const cardText = createCardText(card);

    // Generate embedding using Gemini
    const { embedding } = await embed({
      model: google.textEmbeddingModel("text-embedding-004"),
      value: cardText,
    });

    return embedding;
  } catch (error) {
    console.error("Error generating text embedding:", error);
    throw new Error("Failed to generate text embedding");
  }
}

/**
 * Generate text embedding from a search query
 * Used for text-to-text similarity search
 */
export async function generateQueryTextEmbedding(
  query: string
): Promise<number[]> {
  try {
    const { embedding } = await embed({
      model: google.textEmbeddingModel("text-embedding-004"),
      value: query,
    });

    return embedding;
  } catch (error) {
    console.error("Error generating query text embedding:", error);
    throw new Error("Failed to generate query text embedding");
  }
}

/**
 * Generate image embedding using pixel-based approach
 * Returns a 512-dimensional vector for image similarity search
 */
export async function generateImageEmbedding(
  imageBuffer: Buffer
): Promise<number[]> {
  try {
    const resized = await sharp(imageBuffer)
      .resize(IMAGE_EMBED_WIDTH, IMAGE_EMBED_HEIGHT, {
        fit: "cover",
      })
      .grayscale()
      .raw()
      .toBuffer();

    // Convert pixel data (0-255) into normalized vector
    const pixels = Array.from(resized).map((value) => value / 255);
    return normalizeVector(pixels);
  } catch (error) {
    console.error("Error generating image embedding:", error);
    throw new Error("Failed to generate image embedding");
  }
}

/**
 * Generate text embedding from a search query for text-to-image similarity search
 * Uses a character-based hashing approach to create a 512-dimensional vector
 */
export async function generateCLIPTextEmbedding(
  query: string
): Promise<number[]> {
  try {
    const normalizedQuery = query.toLowerCase();
    const vector = new Array(IMAGE_EMBED_DIMS).fill(0);

    for (let i = 0; i < normalizedQuery.length; i++) {
      const charCode = normalizedQuery.charCodeAt(i);
      const idx = charCode % IMAGE_EMBED_DIMS;
      vector[idx] += 1;
    }

    return normalizeVector(vector);
  } catch (error) {
    console.error("Error generating CLIP text embedding:", error);
    throw new Error("Failed to generate CLIP text embedding");
  }
}

/**
 * Create a rich text representation of a PSA card for embedding
 */
function createCardText(card: PSACard): string {
  const parts = [
    `Player: ${card.player_name}`,
    `Year: ${card.year}`,
    `Brand: ${card.brand}`,
    `PSA Grade: ${card.psa_grade}/10`,
    `Certification: ${card.cert_number}`,
  ];

  if (card.set_name) {
    parts.push(`Set: ${card.set_name}`);
  }

  if (card.card_number) {
    parts.push(`Card Number: ${card.card_number}`);
  }

  // Add descriptive text for better semantic search
  parts.push(
    `This is a ${card.brand} ${card.year} ${card.player_name} basketball trading card graded PSA ${card.psa_grade}.`
  );

  return parts.join(". ");
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

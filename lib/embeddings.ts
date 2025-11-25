import { embed } from "ai";
import { google } from "@ai-sdk/google";
import {
  pipeline,
  RawImage,
  AutoTokenizer,
  CLIPTextModelWithProjection,
  type PipelineType
} from "@xenova/transformers";
import { PSACard } from "@/types/types";

// Cache for CLIP models to avoid reloading
let clipTextTokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>> | null = null;
let clipTextModel: Awaited<ReturnType<typeof CLIPTextModelWithProjection.from_pretrained>> | null = null;
let clipImageModel: Awaited<ReturnType<typeof pipeline>> | null = null;

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
 * Generate image embedding using CLIP (via Transformers.js)
 * Returns a 512-dimensional vector for image similarity search
 */
export async function generateImageEmbedding(
  imageBuffer: Buffer
): Promise<number[]> {
  try {
    // Load CLIP vision model (cached after first load)
    if (!clipImageModel) {
      clipImageModel = await pipeline(
        "image-feature-extraction",
        "Xenova/clip-vit-base-patch32"
      );
    }

    // Convert buffer to Blob, then to RawImage
    const blob = new Blob([imageBuffer]);
    const image = await RawImage.fromBlob(blob);

    // Generate embedding
    const output = await clipImageModel(image);

    // Extract the embedding array and normalize
    const embedding = Array.from(output.data) as number[];

    return embedding;
  } catch (error) {
    console.error("Error generating image embedding:", error);
    throw new Error("Failed to generate image embedding");
  }
}

/**
 * Generate text embedding from a search query using CLIP text encoder
 * Used for text-to-image similarity search (cross-modal)
 */
export async function generateCLIPTextEmbedding(
  query: string
): Promise<number[]> {
  try {
    // Load CLIP text tokenizer (cached after first load)
    if (!clipTextTokenizer) {
      clipTextTokenizer = await AutoTokenizer.from_pretrained(
        "Xenova/clip-vit-base-patch32"
      );
    }

    // Load CLIP text model (cached after first load)
    if (!clipTextModel) {
      clipTextModel = await CLIPTextModelWithProjection.from_pretrained(
        "Xenova/clip-vit-base-patch32"
      );
    }

    // Tokenize the text
    const text_inputs = await clipTextTokenizer(query, {
      padding: true,
      truncation: true,
    });

    // Generate embeddings using the text model
    const { text_embeds } = await clipTextModel(text_inputs);

    // Extract and normalize the embedding array
    const embedding = Array.from(text_embeds.data) as number[];

    // Normalize the embedding (L2 normalization)
    const norm = Math.sqrt(
      embedding.reduce((sum, val) => sum + val * val, 0)
    );
    const normalizedEmbedding = embedding.map((val) => val / norm);

    return normalizedEmbedding;
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

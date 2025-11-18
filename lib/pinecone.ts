import { Pinecone } from "@pinecone-database/pinecone";
import { CardRecord, PSACard, SearchResult, HybridSearchParams } from "@/types/types";
import { cosineSimilarity } from "./embeddings";

// Initialize Pinecone client (singleton)
let pineconeClient: Pinecone | null = null;

function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;

    if (!apiKey) {
      throw new Error("PINECONE_API_KEY is not set in environment variables");
    }

    pineconeClient = new Pinecone({
      apiKey,
    });
  }

  return pineconeClient;
}

/**
 * Get the Pinecone text index (768 dimensions)
 */
function getTextIndex() {
  const indexName = process.env.PINECONE_TEXT_INDEX || "nba-cards-text";
  const client = getPineconeClient();
  return client.index(indexName);
}

/**
 * Get the Pinecone image index (512 dimensions)
 */
function getImageIndex() {
  const indexName = process.env.PINECONE_IMAGE_INDEX || "nba-cards-image";
  const client = getPineconeClient();
  return client.index(indexName);
}

/**
 * Store a card with its embeddings in Pinecone
 * Uses two separate indexes: text index (768d) and image index (512d)
 */
export async function storeCard(
  card: PSACard,
  imagePath: string,
  textEmbedding: number[],
  imageEmbedding: number[]
): Promise<void> {
  try {
    const textIndex = getTextIndex();
    const imageIndex = getImageIndex();
    const id = card.cert_number; // Use cert_number as unique ID
    const timestamp = new Date().toISOString();

    // Prepare metadata (same for both indexes)
    const metadata = {
      player_name: card.player_name,
      year: card.year,
      brand: card.brand,
      psa_grade: card.psa_grade,
      cert_number: card.cert_number,
      set_name: card.set_name || "",
      card_number: card.card_number || "",
      image_path: imagePath,
      created_at: timestamp,
    };

    // Store text embedding in text index (768 dimensions)
    await textIndex.upsert([
      {
        id,
        values: textEmbedding,
        metadata,
      },
    ]);

    // Store image embedding in image index (512 dimensions)
    await imageIndex.upsert([
      {
        id,
        values: imageEmbedding,
        metadata,
      },
    ]);

    console.log(`Stored card ${id} in Pinecone (text + image indexes)`);
  } catch (error) {
    console.error("Error storing card in Pinecone:", error);
    throw new Error("Failed to store card in vector database");
  }
}

/**
 * Perform hybrid search combining text-to-text and text-to-image similarity
 * Returns ranked results based on weighted combination of both scores
 */
export async function hybridSearch(
  params: HybridSearchParams,
  textQueryEmbedding: number[],
  imageQueryEmbedding: number[]
): Promise<SearchResult[]> {
  try {
    const textIndex = getTextIndex();
    const imageIndex = getImageIndex();

    // Default parameters
    const topK = params.top_k || 10;
    const textWeight = params.text_weight || 0.6;
    const imageWeight = params.image_weight || 0.4;

    // Build filter for metadata (if provided)
    const filter: Record<string, any> = {};
    if (params.filters) {
      if (params.filters.player_name) {
        filter.player_name = { $eq: params.filters.player_name };
      }
      if (params.filters.year) {
        filter.year = { $eq: params.filters.year };
      }
      if (params.filters.brand) {
        filter.brand = { $eq: params.filters.brand };
      }
      if (params.filters.min_grade !== undefined) {
        filter.psa_grade = { $gte: params.filters.min_grade };
      }
      if (params.filters.max_grade !== undefined) {
        if (filter.psa_grade) {
          filter.psa_grade.$lte = params.filters.max_grade;
        } else {
          filter.psa_grade = { $lte: params.filters.max_grade };
        }
      }
    }

    // Query both indexes
    const [textResults, imageResults] = await Promise.all([
      textIndex.query({
        vector: textQueryEmbedding,
        topK: topK * 2, // Get more results to merge
        includeMetadata: true,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
      }),
      imageIndex.query({
        vector: imageQueryEmbedding,
        topK: topK * 2,
        includeMetadata: true,
        filter: Object.keys(filter).length > 0 ? filter : undefined,
      }),
    ]);

    // Create a map to combine scores by card ID
    const combinedScores = new Map<string, SearchResult>();

    // Process text results
    textResults.matches.forEach((match) => {
      if (!match.metadata) return;

      const card: PSACard = {
        player_name: match.metadata.player_name as string,
        year: match.metadata.year as string,
        brand: match.metadata.brand as string,
        psa_grade: match.metadata.psa_grade as number,
        cert_number: match.metadata.cert_number as string,
        set_name: (match.metadata.set_name as string) || undefined,
        card_number: (match.metadata.card_number as string) || undefined,
      };

      combinedScores.set(match.id, {
        card,
        image_path: match.metadata.image_path as string,
        text_score: match.score || 0,
        image_score: 0,
        similarity_score: 0,
      });
    });

    // Process image results and merge
    imageResults.matches.forEach((match) => {
      if (!match.metadata) return;

      const existing = combinedScores.get(match.id);

      if (existing) {
        // Card exists in both results - update image score
        existing.image_score = match.score || 0;
      } else {
        // Card only in image results
        const card: PSACard = {
          player_name: match.metadata.player_name as string,
          year: match.metadata.year as string,
          brand: match.metadata.brand as string,
          psa_grade: match.metadata.psa_grade as number,
          cert_number: match.metadata.cert_number as string,
          set_name: (match.metadata.set_name as string) || undefined,
          card_number: (match.metadata.card_number as string) || undefined,
        };

        combinedScores.set(match.id, {
          card,
          image_path: match.metadata.image_path as string,
          text_score: 0,
          image_score: match.score || 0,
          similarity_score: 0,
        });
      }
    });

    // Calculate combined scores and sort
    const results = Array.from(combinedScores.values())
      .map((result) => ({
        ...result,
        similarity_score:
          result.text_score * textWeight + result.image_score * imageWeight,
      }))
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, topK);

    console.log(`Hybrid search returned ${results.length} results`);

    return results;
  } catch (error) {
    console.error("Error performing hybrid search:", error);
    throw new Error("Failed to perform hybrid search");
  }
}

/**
 * Get all stored cards (for history/listing)
 * Note: This fetches from the text index and returns up to 100 cards
 */
export async function getAllCards(): Promise<CardRecord[]> {
  try {
    const textIndex = getTextIndex();

    // Create a dummy query vector (all zeros) to fetch cards
    // Pinecone doesn't have a "list all" API, so we query with high topK
    const dummyVector = new Array(768).fill(0);

    const results = await textIndex.query({
      vector: dummyVector,
      topK: 100, // Limit to 100 cards
      includeMetadata: true,
    });

    const cards: CardRecord[] = results.matches
      .filter((match) => match.metadata)
      .map((match) => ({
        id: match.id,
        player_name: match.metadata!.player_name as string,
        year: match.metadata!.year as string,
        brand: match.metadata!.brand as string,
        psa_grade: match.metadata!.psa_grade as number,
        cert_number: match.metadata!.cert_number as string,
        set_name: (match.metadata!.set_name as string) || undefined,
        card_number: (match.metadata!.card_number as string) || undefined,
        image_path: match.metadata!.image_path as string,
        text_embedding: [], // Not included in response
        image_embedding: [], // Not included in response
        created_at: match.metadata!.created_at as string,
      }));

    return cards;
  } catch (error) {
    console.error("Error fetching all cards:", error);
    throw new Error("Failed to fetch cards");
  }
}

/**
 * Delete a card from Pinecone (both indexes)
 */
export async function deleteCard(certNumber: string): Promise<void> {
  try {
    const textIndex = getTextIndex();
    const imageIndex = getImageIndex();

    await Promise.all([
      textIndex.deleteOne(certNumber),
      imageIndex.deleteOne(certNumber),
    ]);

    console.log(`Deleted card ${certNumber} from both Pinecone indexes`);
  } catch (error) {
    console.error("Error deleting card from Pinecone:", error);
    throw new Error("Failed to delete card");
  }
}

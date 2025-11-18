import { NextResponse } from "next/server";
import { HybridSearchParams } from "@/types/types";
import {
  generateQueryTextEmbedding,
  generateCLIPTextEmbedding,
} from "@/lib/embeddings";
import { hybridSearch, getAllCards } from "@/lib/pinecone";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/search
 * Perform hybrid search (text-to-text + text-to-image similarity)
 */
export async function POST(request: Request) {
  try {
    const params: HybridSearchParams = await request.json();

    // Validate input
    if (!params.query || params.query.trim().length === 0) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log(`Searching for: "${params.query}"`);

    // Generate embeddings for the query
    console.log("Generating query embeddings...");
    const [textQueryEmbedding, imageQueryEmbedding] = await Promise.all([
      generateQueryTextEmbedding(params.query),
      generateCLIPTextEmbedding(params.query),
    ]);

    // Perform hybrid search
    console.log("Performing hybrid search...");
    const results = await hybridSearch(
      params,
      textQueryEmbedding,
      imageQueryEmbedding
    );

    console.log(`Found ${results.length} results`);

    return NextResponse.json({
      success: true,
      results,
      query: params.query,
      count: results.length,
    });
  } catch (error) {
    console.error("Error performing search:", error);

    return NextResponse.json(
      {
        error: "search_failed",
        message:
          error instanceof Error ? error.message : "Failed to perform search",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search
 * Get all stored cards (for history/browsing)
 */
export async function GET() {
  try {
    console.log("Fetching all cards...");

    const cards = await getAllCards();

    console.log(`Retrieved ${cards.length} cards`);

    return NextResponse.json({
      success: true,
      cards,
      count: cards.length,
    });
  } catch (error) {
    console.error("Error fetching cards:", error);

    return NextResponse.json(
      {
        error: "fetch_failed",
        message:
          error instanceof Error ? error.message : "Failed to fetch cards",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { PSACard } from "@/types/types";
import {
  generateTextEmbedding,
  generateImageEmbedding,
} from "@/lib/embeddings";
import { saveCardImage, base64ToBuffer } from "@/lib/storage";
import { storeCard } from "@/lib/pinecone";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60 seconds for processing

interface UploadRequest {
  card: PSACard;
  imageData: string; // Base64 encoded image
}

/**
 * POST /api/upload
 * Persist a validated PSA card with embeddings to the vector database
 */
export async function POST(request: Request) {
  try {
    const body: UploadRequest = await request.json();
    const { card, imageData } = body;

    // Validate input
    if (!card || !card.cert_number) {
      return NextResponse.json(
        { error: "Invalid card data: missing cert_number" },
        { status: 400 }
      );
    }

    if (!imageData) {
      return NextResponse.json(
        { error: "Invalid request: missing imageData" },
        { status: 400 }
      );
    }

    console.log(`Processing upload for card: ${card.cert_number}`);

    // Step 1: Generate text embedding from card metadata
    console.log("Generating text embedding...");
    const textEmbedding = await generateTextEmbedding(card);

    // Step 2: Generate image embedding using CLIP
    console.log("Generating image embedding...");
    const imageBuffer = base64ToBuffer(imageData);
    const imageEmbedding = await generateImageEmbedding(imageBuffer);

    // Step 3: Save image to local filesystem
    console.log("Saving card image...");
    const imagePath = await saveCardImage(card.cert_number, imageData);

    // Step 4: Store in Pinecone
    console.log("Storing in Pinecone...");
    await storeCard(card, imagePath, textEmbedding, imageEmbedding);

    console.log(`Successfully uploaded card: ${card.cert_number}`);

    return NextResponse.json({
      success: true,
      message: "Card uploaded successfully",
      card: {
        ...card,
        image_path: imagePath,
      },
    });
  } catch (error) {
    console.error("Error uploading card:", error);

    return NextResponse.json(
      {
        error: "upload_failed",
        message:
          error instanceof Error ? error.message : "Failed to upload card",
      },
      { status: 500 }
    );
  }
}

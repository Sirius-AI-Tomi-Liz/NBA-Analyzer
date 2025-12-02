import { NextRequest, NextResponse } from "next/server";
import { executePSACardAgent } from "@/lib/agent";
import { AnalysisResponse } from "@/types/types";

export const runtime = "nodejs";
export const maxDuration = 120; // Allow up to 2 minutes for full agent execution

/**
 * POST /api/agent
 * Unified LangGraph Agent endpoint for PSA card processing
 * 
 * This endpoint orchestrates the entire card processing workflow:
 * 1. Image processing and validation
 * 2. NBA card extraction and validation
 * 3. PSA certification verification
 * 4. Rich description generation (with optional web search)
 * 5. Embedding generation (text + image)
 * 6. Database persistence
 * 
 * Input:
 * - image: Base64 encoded image string
 * - mimeType: MIME type of the image
 * - userHint: Optional hint about the card
 * - shouldWebSearch: Whether to perform web search for additional info
 * 
 * Output:
 * - success: boolean
 * - data: PSACard object with additional metadata
 * - OR error with reason
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, mimeType, userHint, shouldWebSearch } = body;

    // Validate input
    if (!image) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 }
      );
    }

    if (!mimeType) {
      return NextResponse.json(
        { error: "No mimeType provided" },
        { status: 400 }
      );
    }

    // Check API keys
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: "Google API key not configured" },
        { status: 500 }
      );
    }

    if (shouldWebSearch && !process.env.TAVILY_API_KEY) {
      console.warn("⚠️ Web search requested but TAVILY_API_KEY not configured");
    }

    console.log("📥 Agent request received");
    console.log(`  - MIME Type: ${mimeType}`);
    console.log(`  - User Hint: ${userHint || "none"}`);
    console.log(`  - Web Search: ${shouldWebSearch ? "yes" : "no"}`);

    // Execute the LangGraph agent
    const finalState = await executePSACardAgent({
      imageData: image,
      mimeType,
      userHint,
      shouldWebSearch,
    });

    // Check for errors in agent execution
    if (finalState.errors && finalState.errors.length > 0) {
      console.error("Agent execution had errors:", finalState.errors);
    }

    // Build response based on final state
    let response: any; // Using any to allow extended fields

    if (finalState.finalResult?.success) {
      // Success - card processed and saved
      response = {
        success: true,
        data: {
          ...finalState.finalResult.card,
          description: finalState.description,
          image_path: finalState.imagePath,
          cert_url: finalState.certificationResult?.cert_url,
          // New fields for synthetic document and audio narration
          synthetic_document_path: finalState.syntheticDocumentPath,
          synthetic_card_data: finalState.syntheticCardData,
          audio_narration_path: finalState.audioNarrationPath,
        },
      };

      console.log("✅ Agent completed successfully");
      if (finalState.finalResult.card) {
        console.log(`  - Card: ${finalState.finalResult.card.player_name}`);
        console.log(`  - Cert: ${finalState.finalResult.card.cert_number}`);
      }
    } else {
      // Error - return error details
      response = {
        error: "image_not_supported",
        reason: finalState.finalResult?.reason || "Failed to process card",
      };

      console.log("❌ Agent failed");
      console.log(`  - Reason: ${response.reason}`);
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("❌ API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}


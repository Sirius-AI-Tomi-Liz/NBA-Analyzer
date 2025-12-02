import { generateTextEmbedding, generateImageEmbedding } from "@/lib/embeddings";
import { AgentState } from "../types";

/**
 * Tool 5: Generate Embeddings
 * Reuses Assignment-2 functionality for embedding generation
 * Creates both text (768d) and image (512d) embeddings
 */
export async function generateEmbeddings(state: AgentState): Promise<Partial<AgentState>> {
  console.log("🔧 Tool: generate_embeddings - Creating text and image embeddings...");
  
  try {
    const { validationResult, imageBuffer } = state;
    
    if (!validationResult?.is_valid || !validationResult.card_data) {
      throw new Error("No valid card data for embedding generation");
    }
    
    if (!imageBuffer) {
      throw new Error("No image buffer available for image embedding");
    }
    
    const card = validationResult.card_data;
    
    // Generate embeddings in parallel
    console.log("📊 Generating text embedding (768d)...");
    console.log("🖼️  Generating image embedding (512d)...");
    
    const [textEmbedding, imageEmbedding] = await Promise.all([
      generateTextEmbedding(card),
      generateImageEmbedding(imageBuffer),
    ]);
    
    console.log(`✅ Text embedding generated: ${textEmbedding.length} dimensions`);
    console.log(`✅ Image embedding generated: ${imageEmbedding.length} dimensions`);
    
    return {
      textEmbedding,
      imageEmbedding,
      currentStep: "generate_embeddings_completed",
      next: "save_to_database",
    };
  } catch (error) {
    console.error("❌ Error in generate_embeddings:", error);
    
    return {
      currentStep: "generate_embeddings_failed",
      errors: [...(state.errors || []), error instanceof Error ? error.message : "Embedding generation failed"],
      finalResult: {
        success: false,
        error: "embedding_failed",
        reason: error instanceof Error ? error.message : "Failed to generate embeddings",
      },
      next: "end",
    };
  }
}




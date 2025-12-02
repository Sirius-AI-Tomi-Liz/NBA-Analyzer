import { saveCardImage } from "@/lib/storage";
import { storeCard } from "@/lib/pinecone";
import { AgentState } from "../types";

/**
 * Tool 8: Save to Database
 * Persists all card information to Pinecone and saves image locally
 */
export async function saveToDatabase(state: AgentState): Promise<Partial<AgentState>> {
  console.log("🔧 Tool: save_to_database - Persisting card to database...");
  
  try {
    const {
      validationResult,
      imageData,
      textEmbedding,
      imageEmbedding,
      description,
      syntheticDocumentPath,
      syntheticCardData,
      audioNarrationPath,
    } = state;
    
    if (!validationResult?.is_valid || !validationResult.card_data) {
      throw new Error("No valid card data to save");
    }
    
    if (!imageData) {
      throw new Error("No image data to save");
    }
    
    if (!textEmbedding || !imageEmbedding) {
      throw new Error("Embeddings not generated");
    }
    
    const card = validationResult.card_data;
    
    // Step 1: Save image to local filesystem
    console.log("💾 Saving card image to filesystem...");
    const imagePath = await saveCardImage(card.cert_number, imageData);
    console.log(`✅ Image saved: ${imagePath}`);
    
    // Step 2: Store in Pinecone (both text and image indexes)
    console.log("☁️  Storing card in Pinecone...");
    await storeCard(card, imagePath, textEmbedding, imageEmbedding);
    console.log(`✅ Card stored in Pinecone: ${card.cert_number}`);
    
    // Build final success result with all generated content
    const finalResult = {
      success: true,
      card,
      description,
      imagePath,
      syntheticDocumentPath,
      syntheticCardData,
      audioNarrationPath,
    };
    
    console.log(`🎉 Card processing completed successfully!`);
    
    return {
      imagePath,
      finalResult,
      currentStep: "save_to_database_completed",
      next: "end",
    };
  } catch (error) {
    console.error("❌ Error in save_to_database:", error);
    
    return {
      currentStep: "save_to_database_failed",
      errors: [...(state.errors || []), error instanceof Error ? error.message : "Database save failed"],
      finalResult: {
        success: false,
        error: "save_failed",
        reason: error instanceof Error ? error.message : "Failed to save card to database",
      },
      next: "end",
    };
  }
}




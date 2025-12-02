import { AgentState } from "../types";

/**
 * Tool 1: Get Card Information
 * Processes the uploaded image and prepares it for analysis
 */
export async function getCardInfo(state: AgentState): Promise<Partial<AgentState>> {
  console.log("🔧 Tool: get_card_info - Processing image...");
  
  try {
    const { imageData, mimeType } = state;
    
    if (!imageData) {
      throw new Error("No image data provided");
    }
    
    if (!mimeType) {
      throw new Error("No MIME type provided");
    }
    
    // Validate mime type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    
    if (!allowedTypes.includes(mimeType)) {
      throw new Error("Invalid image type. Supported types: JPEG, PNG, WEBP, PDF");
    }
    
    // Extract base64 data from data URL
    const base64Data = imageData.split(",")[1] || imageData;
    const imageBuffer = Buffer.from(base64Data, "base64");
    
    // Validate image size (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (imageBuffer.length > maxSize) {
      throw new Error("Image too large. Maximum size is 20MB.");
    }
    
    console.log(`✅ Image processed: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
    
    return {
      imageBuffer,
      currentStep: "get_card_info_completed",
      next: "validate_nba_card",
    };
  } catch (error) {
    console.error("❌ Error in get_card_info:", error);
    
    return {
      currentStep: "get_card_info_failed",
      errors: [...(state.errors || []), error instanceof Error ? error.message : "Unknown error"],
      finalResult: {
        success: false,
        error: "image_processing_failed",
        reason: error instanceof Error ? error.message : "Failed to process image",
      },
      next: "end",
    };
  }
}




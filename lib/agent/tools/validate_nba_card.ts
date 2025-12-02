import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { z } from "zod";
import { AgentState } from "../types";

// Zod schema to validate the structured output (reused from A1)
const analysisSchema = z.object({
  is_valid_psa_card: z
    .boolean()
    .describe("true if this is a valid PSA-graded NBA card, false otherwise"),
  player_name: z
    .string()
    .optional()
    .describe("Full name of the NBA player (only if valid)"),
  year: z
    .string()
    .optional()
    .describe("Card year (e.g., '2003', '2003-04') (only if valid)"),
  brand: z
    .string()
    .optional()
    .describe(
      "Card manufacturer (e.g., 'Topps', 'Upper Deck', 'Panini') (only if valid)"
    ),
  psa_grade: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .describe("PSA numerical grade from 1 to 10 (only if valid)"),
  cert_number: z
    .string()
    .optional()
    .describe("PSA certification number (only if valid)"),
  set_name: z
    .string()
    .optional()
    .describe("Specific set name if visible (e.g., 'Chrome', 'Finest')"),
  card_number: z
    .string()
    .optional()
    .describe("Card number if visible (e.g., '#23', 'RC-1')"),
  rejection_reason: z
    .string()
    .optional()
    .describe(
      "Specific reason why the image is not valid (only if is_valid_psa_card is false)"
    ),
});

const ANALYSIS_PROMPT = `You are an expert in analyzing PSA (Professional Sports Authenticator) graded NBA trading cards.

Examine the image and determine if it contains a valid PSA-graded NBA trading card.

VALID PSA CARD REQUIREMENTS:
- Must have a PSA authentication label/slab visible
- PSA logo and branding clearly visible
- Contains PSA certification number
- Shows numerical grade from 1 to 10
- Displays player name, year, and card brand

If valid (is_valid_psa_card=true), extract all information from the PSA label.
If not valid (is_valid_psa_card=false), provide a specific rejection_reason.

INVALID SCENARIOS (set is_valid_psa_card=false):
- Raw/ungraded cards (no PSA slab)
- Cards graded by other companies (BGS, SGC, CGC, etc.)
- Blurry or unclear images
- Not a trading card
- Not an NBA card
- PSA label not clearly visible

EXTRACTION RULES:
- Extract text exactly as shown on PSA label
- For psa_grade: use only the number (10, not "GEM MT 10")
- Properly capitalize all text fields
- Be strict: if uncertain, set is_valid_psa_card=false`;

/**
 * Tool 2: Validate NBA Card
 * Reuses Assignment-1's validator/extractor to return structured JSON if valid
 */
export async function validateNBACard(state: AgentState): Promise<Partial<AgentState>> {
  console.log("🔧 Tool: validate_nba_card - Analyzing card with AI...");
  
  try {
    const { imageBuffer, userHint } = state;
    
    if (!imageBuffer) {
      throw new Error("No image buffer available");
    }
    
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      throw new Error("Google API key not configured");
    }
    
    // Build prompt with optional user hint
    let prompt = ANALYSIS_PROMPT;
    if (userHint) {
      prompt += `\n\nUser hint: ${userHint}`;
    }
    
    // Gemini API with Vercel AI SDK
    const result = await generateObject({
      model: google("gemini-2.0-flash-exp"),
      schema: analysisSchema,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt,
            },
            {
              type: "image",
              image: imageBuffer,
            },
          ],
        },
      ],
      temperature: 0.1,
    });
    
    const analysisResult = result.object;
    
    if (analysisResult.is_valid_psa_card) {
      // Validate all required fields are present
      if (
        !analysisResult.player_name ||
        !analysisResult.year ||
        !analysisResult.brand ||
        !analysisResult.psa_grade ||
        !analysisResult.cert_number
      ) {
        console.log("❌ Valid PSA card but missing required fields");
        return {
          validationResult: {
            is_valid: false,
            error: "Unable to extract all required information from the PSA label.",
          },
          currentStep: "validate_nba_card_failed",
          finalResult: {
            success: false,
            error: "image_not_supported",
            reason: "Unable to extract all required information from the PSA label.",
          },
          next: "end",
        };
      }
      
      const cardData = {
        player_name: analysisResult.player_name,
        year: analysisResult.year,
        brand: analysisResult.brand,
        psa_grade: analysisResult.psa_grade,
        cert_number: analysisResult.cert_number,
        set_name: analysisResult.set_name,
        card_number: analysisResult.card_number,
      };
      
      console.log(`✅ Valid NBA card detected: ${cardData.player_name} - ${cardData.cert_number}`);
      
      return {
        validationResult: {
          is_valid: true,
          card_data: cardData,
        },
        currentStep: "validate_nba_card_completed",
        next: "certify_card",
      };
    } else {
      console.log(`❌ Invalid card: ${analysisResult.rejection_reason}`);
      
      return {
        validationResult: {
          is_valid: false,
          rejection_reason: analysisResult.rejection_reason || "Image does not contain a valid PSA-graded NBA card.",
        },
        currentStep: "validate_nba_card_rejected",
        finalResult: {
          success: false,
          error: "image_not_supported",
          reason: analysisResult.rejection_reason || "Image does not contain a valid PSA-graded NBA card.",
        },
        next: "end",
      };
    }
  } catch (error) {
    console.error("❌ Error in validate_nba_card:", error);
    
    return {
      currentStep: "validate_nba_card_failed",
      errors: [...(state.errors || []), error instanceof Error ? error.message : "Unknown error"],
      finalResult: {
        success: false,
        error: "validation_failed",
        reason: error instanceof Error ? error.message : "Failed to validate card",
      },
      next: "end",
    };
  }
}




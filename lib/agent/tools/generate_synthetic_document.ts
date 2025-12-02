import { GoogleGenAI } from "@google/genai";
import { AgentState } from "../types";
import { PSACard } from "@/types/types";
import * as fs from "fs";
import * as path from "path";

// NBA Players list for generating synthetic data
const NBA_PLAYERS = [
  "LeBron James",
  "Michael Jordan",
  "Kobe Bryant",
  "Stephen Curry",
  "Kevin Durant",
  "Magic Johnson",
  "Larry Bird",
  "Shaquille O'Neal",
  "Tim Duncan",
  "Kareem Abdul-Jabbar",
  "Hakeem Olajuwon",
  "Karl Malone",
  "Charles Barkley",
  "Patrick Ewing",
  "David Robinson",
  "Scottie Pippen",
  "John Stockton",
  "Isiah Thomas",
  "Allen Iverson",
  "Dwyane Wade",
];

const CARD_BRANDS = [
  "Topps",
  "Panini",
  "Upper Deck",
  "Fleer",
  "Hoops",
  "Donruss",
  "Skybox",
  "Score",
];

const SET_NAMES = [
  "Chrome",
  "Prizm",
  "Select",
  "Mosaic",
  "Optic",
  "Base Set",
  "Finest",
  "Revolution",
];

/**
 * Generate random synthetic card data
 */
function generateSyntheticCardData(): PSACard {
  const randomPlayer =
    NBA_PLAYERS[Math.floor(Math.random() * NBA_PLAYERS.length)];
  const randomBrand =
    CARD_BRANDS[Math.floor(Math.random() * CARD_BRANDS.length)];
  const randomSetName =
    SET_NAMES[Math.floor(Math.random() * SET_NAMES.length)];
  const randomYear = `${1985 + Math.floor(Math.random() * 40)}-${String(
    (1986 + Math.floor(Math.random() * 40)) % 100
  ).padStart(2, "0")}`;
  const randomGrade = Math.floor(Math.random() * 4) + 7; // PSA 7-10
  const randomCertNumber = String(
    Math.floor(Math.random() * 90000000) + 10000000
  );
  const randomCardNumber = `#${Math.floor(Math.random() * 300) + 1}`;

  return {
    player_name: randomPlayer,
    year: randomYear,
    brand: randomBrand,
    psa_grade: randomGrade,
    cert_number: randomCertNumber,
    set_name: randomSetName,
    card_number: randomCardNumber,
  };
}

/**
 * Tool 5: Generate Synthetic Document
 * Edits the original card image to replace texts with synthetic data
 * and places it in a new environment using Gemini image editing
 */
export async function generateSyntheticDocument(
  state: AgentState
): Promise<Partial<AgentState>> {
  console.log(
    "🔧 Tool: generate_synthetic_document - Creating synthetic card image..."
  );

  try {
    const { validationResult, imageData, mimeType } = state;

    if (!validationResult?.is_valid || !validationResult.card_data) {
      console.warn("⚠️ No valid card data for synthetic document generation");
      return {
        currentStep: "generate_synthetic_document_skipped",
        next: "generate_audio_narration",
      };
    }

    if (!imageData) {
      console.warn("⚠️ No original image data available for editing");
      return {
        currentStep: "generate_synthetic_document_skipped",
        next: "generate_audio_narration",
      };
    }

    const originalCard = validationResult.card_data;
    const syntheticCardData = generateSyntheticCardData();

    console.log(
      `📝 Original card: ${originalCard.player_name} - ${originalCard.year} ${originalCard.brand}`
    );
    console.log(
      `📝 Synthetic data: ${syntheticCardData.player_name} - ${syntheticCardData.year} ${syntheticCardData.brand}`
    );

    const googleApiKey =
      process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!googleApiKey) {
      throw new Error(
        "Google Generative AI key missing. Set GOOGLE_GENERATIVE_AI_API_KEY."
      );
    }

    // Build the edit prompt - instruct Gemini to modify specific texts and add environment
    const editPrompt = `Edit this PSA graded basketball card image with the following changes:

1. REPLACE ALL TEXT on the PSA label (the red label at the top of the slab):
   - Change the player name to: "${syntheticCardData.player_name}"
   - Change the year to: "${syntheticCardData.year}"
   - Change the brand to: "${syntheticCardData.brand}"
   - Change the PSA grade number to: "${syntheticCardData.psa_grade}"
   - Change the certification number to: "${syntheticCardData.cert_number}"

2. KEEP the actual card image inside the slab EXACTLY THE SAME - do not change the player photo or card design.

3. CHANGE THE BACKGROUND: Place the card on a wooden collector's desk with other trading cards and collectibles around it. Add professional studio lighting with soft shadows.

Important: Keep the PSA slab holder appearance authentic. Only modify the text labels, not the card artwork inside.`;

    console.log("🎨 Requesting image edit from Gemini...");

    // Ensure synthetic directory exists
    const syntheticDir = path.join(process.cwd(), "public", "synthetic");
    if (!fs.existsSync(syntheticDir)) {
      fs.mkdirSync(syntheticDir, { recursive: true });
    }

    let syntheticDocumentPath: string | undefined;

    try {
      // Initialize Google GenAI
      const ai = new GoogleGenAI({ apiKey: googleApiKey });

      // Prepare the original image - remove data URL prefix if present
      let base64Image = imageData;
      if (imageData.includes(",")) {
        base64Image = imageData.split(",")[1];
      }

      // Determine MIME type
      const imageMimeType = mimeType || "image/jpeg";

      // Edit image using Gemini with the original image as input
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: [
          {
            role: "user",
            parts: [
              { text: editPrompt },
              {
                inlineData: {
                  mimeType: imageMimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
        },
      });

      // Extract edited image from response
      let imageFound = false;
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            // Save the edited image
            const editedImageData = part.inlineData.data;
            const buffer = Buffer.from(editedImageData, "base64");

            const imageFileName = `${originalCard.cert_number}_synthetic.png`;
            const imageFilePath = path.join(syntheticDir, imageFileName);

            fs.writeFileSync(imageFilePath, buffer);
            syntheticDocumentPath = `/synthetic/${imageFileName}`;
            imageFound = true;

            console.log(
              `✅ Synthetic document image saved to ${syntheticDocumentPath}`
            );
            break;
          }
        }
      }

      if (!imageFound) {
        throw new Error("No edited image data received from Gemini");
      }
    } catch (imageError) {
      console.warn(
        "⚠️ Image editing failed, saving metadata instead:",
        imageError instanceof Error ? imageError.message : "Unknown error"
      );

      // Fallback: save metadata JSON
      const metadataPath = path.join(
        syntheticDir,
        `${originalCard.cert_number}_synthetic_metadata.json`
      );

      const metadata = {
        originalCard: originalCard,
        syntheticCard: syntheticCardData,
        editPrompt: editPrompt,
        error:
          imageError instanceof Error ? imageError.message : "Unknown error",
        createdAt: new Date().toISOString(),
      };

      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      syntheticDocumentPath = `/synthetic/${originalCard.cert_number}_synthetic_metadata.json`;

      console.log(
        `✅ Synthetic document metadata saved to ${syntheticDocumentPath}`
      );
    }

    return {
      syntheticDocumentPath,
      syntheticCardData,
      currentStep: "generate_synthetic_document_completed",
      next: "generate_audio_narration",
    };
  } catch (error) {
    console.error("❌ Error in generate_synthetic_document:", error);

    // Non-fatal error - continue to next tool
    return {
      currentStep: "generate_synthetic_document_failed",
      errors: [
        ...(state.errors || []),
        `Synthetic document generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      ],
      next: "generate_audio_narration",
    };
  }
}

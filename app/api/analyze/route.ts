import { NextRequest, NextResponse } from "next/server";
import { generateObject } from "ai";
import { google } from "@ai-sdk/google";
import { AnalysisResponse } from "@/types/types";
import { z } from "zod";

// Zod schema to validate the structured output
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, mimeType } = body;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    if (!mimeType) {
      return NextResponse.json(
        { error: "No mimeType provided" },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json(
        { error: "Google API key not configured" },
        { status: 500 }
      );
    }

    // Extract base64 data from data URL
    const base64Data = image.split(",")[1] || image;
    const imageBuffer = Buffer.from(base64Data, "base64");

    // Validate image size (max 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (imageBuffer.length > maxSize) {
      return NextResponse.json(
        { error: "Image too large. Maximum size is 20MB." },
        { status: 400 }
      );
    }

    // Validate mime type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowedTypes.includes(mimeType)) {
      return NextResponse.json(
        { error: "Invalid image type. Supported types: JPEG, PNG, WEBP, PDF" },
        { status: 400 }
      );
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
              text: ANALYSIS_PROMPT,
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

    let response: AnalysisResponse;

    if (analysisResult.is_valid_psa_card) {
      if (
        !analysisResult.player_name ||
        !analysisResult.year ||
        !analysisResult.brand ||
        !analysisResult.psa_grade ||
        !analysisResult.cert_number
      ) {
        return NextResponse.json({
          error: "image_not_supported",
          reason:
            "Unable to extract all required information from the PSA label.",
        } as AnalysisResponse);
      }

      response = {
        success: true,
        data: {
          player_name: analysisResult.player_name,
          year: analysisResult.year,
          brand: analysisResult.brand,
          psa_grade: analysisResult.psa_grade,
          cert_number: analysisResult.cert_number,
          set_name: analysisResult.set_name,
          card_number: analysisResult.card_number,
        },
      };
    } else {
      response = {
        error: "image_not_supported",
        reason:
          analysisResult.rejection_reason ||
          "Image does not contain a valid PSA-graded NBA card.",
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("API error:", error);

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

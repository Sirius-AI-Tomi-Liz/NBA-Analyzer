import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TavilyClient } from "tavily";
import { AgentState } from "../types";

function buildBaseDescription(
  card: NonNullable<AgentState["validationResult"]>["card_data"],
  certUrl?: string
): string {
  if (!card) {
    return "Card description unavailable";
  }

  let description = `This is a PSA ${card.psa_grade} graded ${card.year} ${card.brand}`;

  if (card.set_name) {
    description += ` ${card.set_name}`;
  }

  description += ` card featuring ${card.player_name}.`;

  if (card.card_number) {
    description += ` Card number: ${card.card_number}.`;
  }

  description += ` PSA Certification: ${card.cert_number}.`;

  if (certUrl) {
    description += ` You can verify this card at ${certUrl}.`;
  }

  return description;
}

function extractTextFromAIMessage(message: { content?: unknown }): string {
  if (!message || typeof message !== "object" || message === null) {
    return "";
  }

  const { content } = message as { content?: unknown };

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return (
      (content as Array<{ text?: string } | string>)
        .map((part) => {
          if (typeof part === "string") {
            return part;
          }

          if (part && typeof part.text === "string") {
            return part.text;
          }

          return "";
        })
        .join("\n")
        .trim()
    );
  }

  return "";
}

/**
 * Tool 4: Describe Card
 * Creates a collector-friendly description from the JSON
 * Optionally calls web search to fill non-label facts
 */
export async function describeCard(state: AgentState): Promise<Partial<AgentState>> {
  console.log("🔧 Tool: describe_card - Creating collector-friendly description...");
  
  try {
    const { validationResult, certificationResult, userHint, shouldWebSearch } = state;
    
    if (!validationResult?.is_valid || !validationResult.card_data) {
      throw new Error("No valid card data to describe");
    }
    
    const card = validationResult.card_data;
    const baseDescription = buildBaseDescription(card, certificationResult?.cert_url);
    let description = baseDescription;
    let webSearchSummary: string | undefined;
    const newErrors: string[] = [];

    if (shouldWebSearch) {
      if (!process.env.TAVILY_API_KEY) {
        const warning = "Web search requested but TAVILY_API_KEY is not configured.";
        console.warn(`⚠️ ${warning}`);
        newErrors.push(warning);
      } else {
        try {
          console.log("🔍 Web search requested via Tavily...");
          const tavilyClient = new TavilyClient({
            apiKey: process.env.TAVILY_API_KEY,
          });

          const searchQuery = `PSA ${card.year} ${card.brand} ${card.player_name} collector facts significance`;
          const tavilyResponse = await tavilyClient.search({
            query: searchQuery,
            include_answer: true,
            include_images: false,
            search_depth: "advanced",
            max_results: 5,
          });

          const summarizedFacts = tavilyResponse.results
            .slice(0, 3)
            .map(
              (result, index) =>
                `Fact ${index + 1}: ${result.title} — ${result.content}`
            )
            .join("\n");

          const combinedSummary = [
            tavilyResponse.answer ? `Summary: ${tavilyResponse.answer}` : "",
            summarizedFacts,
          ]
            .filter(Boolean)
            .join("\n\n")
            .trim();
          
          webSearchSummary =
            combinedSummary.length > 0 ? combinedSummary : undefined;

          console.log("✅ Tavily search completed");
        } catch (searchError) {
          const message =
            searchError instanceof Error
              ? searchError.message
              : "Unknown Tavily search error";
          console.warn("⚠️ Tavily search failed:", message);
          newErrors.push(`Tavily search failed: ${message}`);
        }
      }
    }

    try {
      const googleApiKey =
        process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;

      if (!googleApiKey) {
        throw new Error(
          "Google Generative AI key missing. Set GOOGLE_GENERATIVE_AI_API_KEY."
        );
      }

      const model = new ChatGoogleGenerativeAI({
        model: "gemini-2.0-flash-exp",
        temperature: 0.7,
        apiKey: googleApiKey,
      });

      const enhancedPrompt = `You are a knowledgeable sports card collector.

Known card metadata:
${JSON.stringify(card, null, 2)}

Baseline description:
${baseDescription}

User hint: ${userHint || "none provided"}

${
  webSearchSummary
    ? `External research findings:\n${webSearchSummary}`
    : "No external research results were available."
}

Compose a collector-friendly description (2 short paragraphs max) that:
1. Highlights what makes this PSA card interesting.
2. References relevant player or set context from the research when available.
3. Mentions the PSA grade and certification verification.
4. Reads naturally for hobbyists without sounding repetitive.

Return only the final description text.`;

      const response = await model.invoke(enhancedPrompt);
      const aiDescription = extractTextFromAIMessage(response);

      if (aiDescription) {
        description = aiDescription;
      }

      console.log(`✅ Description created for ${card.player_name}`);
    } catch (descriptionError) {
      console.warn(
        "⚠️ Description enhancement failed, using base description:",
        descriptionError
      );
      newErrors.push(
        descriptionError instanceof Error
          ? descriptionError.message
          : "Description enhancement failed"
      );
    }

    const mergedErrors =
      newErrors.length > 0 ? [...(state.errors || []), ...newErrors] : undefined;
    
    return {
      description,
      webSearchResults: webSearchSummary,
      currentStep: "describe_card_completed",
      ...(mergedErrors ? { errors: mergedErrors } : {}),
      next: "generate_embeddings",
    };
  } catch (error) {
    console.error("❌ Error in describe_card:", error);
    
    // Non-fatal error - create basic description
    const card = state.validationResult?.card_data;
    const basicDescription = card 
      ? `PSA ${card.psa_grade} ${card.year} ${card.brand} ${card.player_name} - Cert #${card.cert_number}`
      : "Card description unavailable";
    
    return {
      description: basicDescription,
      webSearchResults: state.webSearchResults,
      currentStep: "describe_card_failed",
      errors: [...(state.errors || []), error instanceof Error ? error.message : "Description failed"],
      next: "generate_embeddings", // Continue anyway
    };
  }
}


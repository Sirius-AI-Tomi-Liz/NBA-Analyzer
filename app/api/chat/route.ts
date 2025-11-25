import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { ChatMessage } from "@/types/types";
import {
  generateQueryTextEmbedding,
  generateCLIPTextEmbedding,
} from "@/lib/embeddings";
import { hybridSearch } from "@/lib/pinecone";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/chat
 * RAG-powered conversational interface for PSA card search
 * Retrieves relevant cards and uses them as context for the LLM
 */
export async function POST(request: Request) {
  try {
    const { messages }: { messages: ChatMessage[] } = await request.json();

    // Validate input
    if (!messages || messages.length === 0) {
      return new Response("Messages are required", { status: 400 });
    }

    // Get the last user message
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .pop();

    if (!lastUserMessage) {
      return new Response("No user message found", { status: 400 });
    }

    // Extract text content from message parts or content field
    // The @ai-sdk/react sends messages with a parts array, not a simple content string
    const messageContent = lastUserMessage.parts
      ? lastUserMessage.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("")
      : lastUserMessage.content || "";

    if (!messageContent || !messageContent.trim()) {
      return new Response("Message content is required", { status: 400 });
    }

    console.log(`Chat query: "${messageContent}"`);

    // Step 1: Retrieve relevant cards using hybrid search
    console.log("Retrieving relevant cards...");
    const [textQueryEmbedding, imageQueryEmbedding] = await Promise.all([
      generateQueryTextEmbedding(messageContent),
      generateCLIPTextEmbedding(messageContent),
    ]);

    const searchResults = await hybridSearch(
      {
        query: messageContent,
        top_k: 5, // Get top 5 most relevant cards
        text_weight: 0.6,
        image_weight: 0.4,
      },
      textQueryEmbedding,
      imageQueryEmbedding
    );

    console.log(`Retrieved ${searchResults.length} relevant cards`);

    // Step 2: Build context from retrieved cards
    let context = "";

    if (searchResults.length > 0) {
      context = `Here are the most relevant PSA graded NBA cards from the collection:\n\n`;

      searchResults.forEach((result, index) => {
        const card = result.card;
        context += `${index + 1}. ${card.player_name} - ${card.year} ${card.brand}`;

        if (card.set_name) {
          context += ` ${card.set_name}`;
        }

        context += `\n   PSA Grade: ${card.psa_grade}/10\n`;
        context += `   Certification: ${card.cert_number}\n`;

        if (card.card_number) {
          context += `   Card Number: ${card.card_number}\n`;
        }

        context += `   Similarity Score: ${(result.similarity_score * 100).toFixed(1)}%\n`;
        context += `   Image: ${result.image_path}\n\n`;
      });
    } else {
      context =
        "No cards found in the collection matching this query. The collection may be empty or the query doesn't match any stored cards.\n\n";
    }

    // Step 3: Create system prompt with RAG context
    const systemPrompt = `You are a helpful AI assistant for a PSA graded NBA card collection database with advanced visual search capabilities.

Your role is to help users find and learn about PSA graded basketball cards in their collection.

IMPORTANT - Your Search Capabilities:
- You have BOTH text-based and visual search capabilities
- The system uses CLIP embeddings for cross-modal search (text-to-image)
- You CAN search for cards based on visual attributes in images, such as:
  * "cards with basketball in the image"
  * "cards showing a player dunking"
  * "cards with Lakers jersey"
  * "rookie cards with action shots"
  * Any other visual descriptions
- The retrieved cards below were found using BOTH metadata matching AND visual similarity
- When users ask about visual attributes, the search has ALREADY been performed

When answering questions:
- Use the retrieved cards as your primary source of information
- Be specific about card details (player, year, brand, grade, etc.)
- If users ask about visual attributes, confidently reference the retrieved cards
- If asked about card values or prices, remind users you don't have pricing data
- If no relevant cards are found, explain that clearly
- Be conversational and helpful
- Format your responses in a clear, easy-to-read way

Retrieved Context:
${context}

Answer the user's question based on the retrieved cards above. If the retrieved cards are relevant to their question, reference them specifically. If not, explain what you can see in the collection.`;

    // Transform ChatMessage[] to ModelMessage[] format expected by streamText
    const transformedMessages = messages.map((msg) => {
      // For messages with parts array
      if (msg.parts && msg.parts.length > 0) {
        const content = msg.parts
          .filter((part) => part.type === "text" && part.text)
          .map((part) => ({
            type: "text" as const,
            text: part.text!,
          }));

        return {
          role: msg.role,
          content: content.length > 0 ? content : msg.content || "",
        };
      }

      // For messages with simple content string
      return {
        role: msg.role,
        content: msg.content || "",
      };
    });

    // Step 4: Stream response using Vercel AI SDK
    const result = streamText({
      model: google("gemini-2.0-flash-exp"),
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...transformedMessages,
      ],
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in chat endpoint:", error);

    return new Response(
      JSON.stringify({
        error: "chat_failed",
        message: error instanceof Error ? error.message : "Chat failed",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

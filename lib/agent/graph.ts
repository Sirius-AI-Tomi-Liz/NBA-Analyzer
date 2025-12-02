// @ts-nocheck - Disable type checking for LangGraph API compatibility
import { StateGraph, END, Annotation } from "@langchain/langgraph";
import { AgentState } from "./types";
import { getCardInfo } from "./tools/get_card_info";
import { validateNBACard } from "./tools/validate_nba_card";
import { certifyCard } from "./tools/certify_card";
import { describeCard } from "./tools/describe_card";
import { generateEmbeddings } from "./tools/generate_embeddings";
import { saveToDatabase } from "./tools/save_to_database";

/**
 * LangGraph State Machine for PSA Card Processing
 * 
 * Flow:
 * 1. get_card_info: Process uploaded image
 * 2. validate_nba_card: Validate and extract card data using AI
 * 3. certify_card: Verify PSA certification
 * 4. describe_card: Create rich description (optional web search)
 * 5. generate_embeddings: Create text and image embeddings
 * 6. save_to_database: Persist to Pinecone and save image
 */

/**
 * Router function to determine next node based on state
 */
function routeNext(state: AgentState): string {
  if (state.next === "end" || state.next === END) {
    return END;
  }
  
  return state.next || END;
}

// Define state annotation for LangGraph
const AgentAnnotation = Annotation.Root({
  imageData: Annotation<string | undefined>,
  mimeType: Annotation<string | undefined>,
  userHint: Annotation<string | undefined>,
  shouldWebSearch: Annotation<boolean>,
  imageBuffer: Annotation<Buffer | undefined>,
  validationResult: Annotation<any>,
  certificationResult: Annotation<any>,
  description: Annotation<string | undefined>,
  webSearchResults: Annotation<string | undefined>,
  textEmbedding: Annotation<number[] | undefined>,
  imageEmbedding: Annotation<number[] | undefined>,
  imagePath: Annotation<string | undefined>,
  currentStep: Annotation<string | undefined>,
  errors: Annotation<string[]>,
  next: Annotation<string | undefined>,
  finalResult: Annotation<any>,
});

/**
 * Create and configure the LangGraph state machine
 */
export function createPSACardAgent() {
  // Define the state graph with annotation
  const workflow = new StateGraph(AgentAnnotation);

  // Add nodes (tools) to the graph
  workflow.addNode("get_card_info", getCardInfo);
  workflow.addNode("validate_nba_card", validateNBACard);
  workflow.addNode("certify_card", certifyCard);
  workflow.addNode("describe_card", describeCard);
  workflow.addNode("generate_embeddings", generateEmbeddings);
  workflow.addNode("save_to_database", saveToDatabase);

  // Set entry point by adding edge from START
  workflow.addEdge("__start__", "get_card_info");

  // Add conditional edges that route based on the 'next' field
  workflow.addConditionalEdges("get_card_info", routeNext);
  workflow.addConditionalEdges("validate_nba_card", routeNext);
  workflow.addConditionalEdges("certify_card", routeNext);
  workflow.addConditionalEdges("describe_card", routeNext);
  workflow.addConditionalEdges("generate_embeddings", routeNext);
  workflow.addConditionalEdges("save_to_database", routeNext);

  // Compile the graph
  return workflow.compile();
}

/**
 * Execute the PSA card processing agent
 */
export async function executePSACardAgent(input: {
  imageData: string;
  mimeType: string;
  userHint?: string;
  shouldWebSearch?: boolean;
}): Promise<AgentState> {
  console.log("🚀 Starting PSA Card Agent...");
  console.log(`📝 User hint: ${input.userHint || "none"}`);
  console.log(`🔍 Web search: ${input.shouldWebSearch ? "enabled" : "disabled"}`);
  
  const agent = createPSACardAgent();
  
  const initialState: AgentState = {
    imageData: input.imageData,
    mimeType: input.mimeType,
    userHint: input.userHint,
    shouldWebSearch: input.shouldWebSearch || false,
    errors: [],
  };
  
  try {
    const finalState = await agent.invoke(initialState);
    console.log("✅ PSA Card Agent completed");
    return finalState;
  } catch (error) {
    console.error("❌ PSA Card Agent failed:", error);
    
    // Return error state
    return {
      ...initialState,
      finalResult: {
        success: false,
        error: "agent_failed",
        reason: error instanceof Error ? error.message : "Agent execution failed",
      },
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}


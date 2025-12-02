import { PSACard } from "@/types/types";

/**
 * Agent state for the LangGraph state machine
 * Contains all data passed between nodes/tools
 */
export interface AgentState {
  // Input
  imageData?: string; // Base64 encoded image
  mimeType?: string; // MIME type of the image
  userHint?: string; // Optional user hint about the card
  
  // Tool outputs
  imageBuffer?: Buffer; // Processed image buffer
  validationResult?: {
    is_valid: boolean;
    card_data?: PSACard;
    error?: string;
    rejection_reason?: string;
  };
  certificationResult?: {
    is_certified: boolean;
    cert_url?: string;
    error?: string;
  };
  description?: string; // Rich collector-friendly description
  webSearchResults?: string; // Additional facts from web search
  textEmbedding?: number[]; // 768d text embedding
  imageEmbedding?: number[]; // 512d image embedding
  imagePath?: string; // Path to saved image

  // Synthetic document generation
  syntheticDocumentPath?: string; // Path to generated synthetic document image
  syntheticCardData?: PSACard; // Dummy data used for synthetic document

  // Audio narration
  audioNarrationPath?: string; // Path to generated audio narration file

  // Final result
  finalResult?: {
    success: boolean;
    card?: PSACard;
    description?: string;
    imagePath?: string;
    error?: string;
    reason?: string;
  };
  
  // Agent control
  currentStep?: string; // Track current step for debugging
  errors?: string[]; // Collect any errors
  shouldWebSearch?: boolean; // Flag to trigger web search
  next?: string; // Next node to execute
}

/**
 * Tool input/output types
 */
export interface ToolInput {
  state: AgentState;
}

export interface ToolOutput {
  state: Partial<AgentState>;
}




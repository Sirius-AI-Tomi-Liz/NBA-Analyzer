export interface PSACard {
  player_name: string; // Name of the player on the card
  year: string; // Year of the card (e.g., "2003-04", "2003")
  brand: string; // Card manufacturer (e.g., "Topps", "Upper Deck", "Panini")
  psa_grade: number; // PSA grade (1-10)
  cert_number: string; // PSA certification number
  set_name?: string; // Card set name (e.g., "Topps Chrome", "Finest")
  card_number?: string; // Card number within the set (e.g., "#23", "RC-1")
}

export interface AnalysisSuccess {
  success: true;
  data: PSACard;
}

export interface AnalysisError {
  error: "image_not_supported";
  reason: string;
}

export type AnalysisResponse = AnalysisSuccess | AnalysisError;

export interface UploadState {
  file: File | null;
  preview: string | null;
  isUploading: boolean;
  isAnalyzing: boolean;
  result: AnalysisResponse | null;
  error: string | null;
}

// RAG System Types

export interface CardRecord extends PSACard {
  id: string; // Unique identifier (same as cert_number)
  image_path: string; // Path to stored image
  text_embedding: number[]; // Gemini text embedding (768 dimensions)
  image_embedding: number[]; // CLIP image embedding (512 dimensions)
  created_at: string; // ISO timestamp
}

export interface SearchResult {
  card: PSACard;
  image_path: string;
  similarity_score: number; // Combined score (0-1)
  text_score: number; // Text similarity score
  image_score: number; // Image similarity score
}

export interface MessagePart {
  type: "text" | "image";
  text?: string;
  image?: string;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content?: string; // For backwards compatibility
  parts?: MessagePart[]; // New format from @ai-sdk/react
}

export interface HybridSearchParams {
  query: string;
  top_k?: number; // Number of results to return (default: 5)
  text_weight?: number; // Weight for text similarity (default: 0.6)
  image_weight?: number; // Weight for image similarity (default: 0.4)
  filters?: {
    player_name?: string;
    year?: string;
    brand?: string;
    min_grade?: number;
    max_grade?: number;
  };
}

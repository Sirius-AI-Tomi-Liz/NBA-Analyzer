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

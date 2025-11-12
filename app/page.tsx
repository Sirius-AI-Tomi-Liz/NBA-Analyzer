"use client";

import { useState } from "react";
import ImageUploader from "./components/ImageUploader";
import AnalysisResult from "./components/AnalysisResult";
import { AnalysisResponse } from "@/types/types";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File, previewUrl: string) => {
    setFile(selectedFile);
    setPreview(previewUrl);
    setResult(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onloadend = async () => {
        const base64String = reader.result as string;

        try {
          const response = await fetch("/api/analyze", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image: base64String,
              mimeType: file.type,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data: AnalysisResponse = await response.json();
          setResult(data);
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : "Analysis failed. Please try again."
          );
        } finally {
          setIsAnalyzing(false);
        }
      };

      reader.onerror = () => {
        setError("Failed to read file. Please try again.");
        setIsAnalyzing(false);
      };
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            NBA PSA Card Analyzer
          </h1>
          <p className="text-lg text-gray-600">
            Upload an image of your PSA-graded NBA trading card to extract its
            information
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <ImageUploader
            onFileSelect={handleFileSelect}
            isDisabled={isAnalyzing}
            currentPreview={preview}
          />

          {/* Action Buttons */}
          {file && (
            <div className="flex gap-4 justify-center">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg
                         hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors duration-200 flex items-center space-x-2 cursor-pointer"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                    <span>Analyze Card</span>
                  </>
                )}
              </button>

              {!isAnalyzing && (
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg
                           hover:bg-gray-300 transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Reset
                </button>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Analysis Result */}
          <AnalysisResult result={result} isAnalyzing={isAnalyzing} />
        </div>
      </div>
    </div>
  );
}

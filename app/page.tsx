"use client";

import { useState } from "react";
import ImageUploader from "./components/ImageUploader";
import AnalysisResult from "./components/AnalysisResult";
import ChatInterface from "./components/ChatInterface";
import CardHistory from "./components/CardHistory";
import { AnalysisResponse, PSACard } from "@/types/types";

type TabType = "analyze" | "chat" | "collection";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("analyze");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleFileSelect = (selectedFile: File, previewUrl: string) => {
    setFile(selectedFile);
    setPreview(previewUrl);
    setResult(null);
    setError(null);
    setUploadSuccess(false);
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setUploadSuccess(false);

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

          // If analysis was successful, automatically save the card
          if ("success" in data && data.success) {
            await handleSaveCard(data.data, base64String);
          }
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

  const handleSaveCard = async (card: PSACard, imageData: string) => {
    setIsUploading(true);
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          card,
          imageData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save card");
      }

      setUploadSuccess(true);
      console.log("Card saved successfully!");
    } catch (err) {
      console.error("Error saving card:", err);
      // Don't show error to user - card was analyzed successfully
      // Just log it for debugging
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setUploadSuccess(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            NBA PSA Card Analyzer & Collection
          </h1>
          <p className="text-lg text-gray-600">
            Analyze, store, and search your PSA-graded NBA trading cards with AI
          </p>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-white rounded-lg shadow-md p-1">
            <button
              onClick={() => setActiveTab("analyze")}
              className={`px-6 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === "analyze"
                  ? "bg-blue-500 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Analyze Card
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-6 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === "chat"
                  ? "bg-blue-500 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Search & Chat
            </button>
            <button
              onClick={() => setActiveTab("collection")}
              className={`px-6 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === "collection"
                  ? "bg-blue-500 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              My Collection
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "analyze" && (
          <div className="bg-white rounded-xl shadow-lg p-8 space-y-6 max-w-4xl mx-auto">
            <ImageUploader
              onFileSelect={handleFileSelect}
              isDisabled={isAnalyzing || isUploading}
              currentPreview={preview}
            />

            {/* Action Buttons */}
            {file && (
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || isUploading}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg
                           hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors duration-200 flex items-center space-x-2 cursor-pointer"
                >
                  {isAnalyzing || isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>{isAnalyzing ? "Analyzing..." : "Saving..."}</span>
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
                      <span>Analyze & Save Card</span>
                    </>
                  )}
                </button>

                {!isAnalyzing && !isUploading && (
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

            {/* Success Message */}
            {uploadSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600 font-medium">
                  Card analyzed and saved to your collection successfully!
                </p>
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
        )}

        {activeTab === "chat" && (
          <div className="space-y-6">
            <ChatInterface />
          </div>
        )}

        {activeTab === "collection" && (
          <div className="space-y-6">
            <CardHistory />
          </div>
        )}
      </div>
    </div>
  );
}

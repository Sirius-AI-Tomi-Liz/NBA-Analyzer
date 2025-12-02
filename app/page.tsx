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
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [userHint, setUserHint] = useState<string>("");
  const [shouldWebSearch, setShouldWebSearch] = useState<boolean>(false);

  const highlightStats = [
    { label: "Cards Validated", value: "2,154", subtext: "PSA slabs analyzed" },
    { label: "Collection Matches", value: "98%", subtext: "Hybrid RAG accuracy" },
    { label: "Average Grade", value: "9.2", subtext: "Across saved cards" },
  ];

  const handleFileSelect = (selectedFile: File, previewUrl: string) => {
    setFile(selectedFile);
    setPreview(previewUrl);
    setResult(null);
    setError(null);
    setUploadSuccess(false);
    setUserHint("");
    setShouldWebSearch(false);
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
          // Use the new unified agent endpoint
          const response = await fetch("/api/agent", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image: base64String,
              mimeType: file.type,
              userHint: userHint.trim() || undefined,
              shouldWebSearch,
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data: AnalysisResponse = await response.json();
          setResult(data);

          // If successful, the agent has already saved the card
          if ("success" in data && data.success) {
            setUploadSuccess(true);
            console.log("Card processed and saved by agent!");
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

  const handleReset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setUploadSuccess(false);
    setUserHint("");
    setShouldWebSearch(false);
  };

  return (
    <div className="min-h-screen pb-12">
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        {/* Hero */}
        <div className="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-r from-[#0b1f40] via-[#132d5c] to-[#bf1f24] text-white shadow-2xl">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.5),_transparent_55%)]" />
          <div className="relative p-8 md:p-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="uppercase tracking-[0.4em] text-xs text-white/70 mb-3">
                  Agentic NBA PSA Pipeline
                </p>
                <h1 className="text-4xl md:text-5xl font-black leading-tight">
                  Analyze. Certify. Collect.
                </h1>
                <p className="mt-4 text-sm md:text-base text-white/90 max-w-2xl">
                  LangGraph-powered multi-tool agent with built-in PSA validation, Tavily-enriched descriptions,
                  and hybrid RAG search. Designed with NBA arena energy for your personal collection war room.
                </p>
              </div>
              <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-5 text-center backdrop-blur">
                <p className="text-xs uppercase tracking-[0.2em] text-white/70">
                  Live Status
                </p>
                <p className="text-3xl font-black mt-2">Ready</p>
                <p className="text-xs text-white/80 mt-1">
                  Upload a PSA label to start the agent
                </p>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {highlightStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-white/10 border border-white/15 px-5 py-4 backdrop-blur-sm"
                >
                  <p className="text-sm uppercase tracking-[0.2em] text-white/70">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-black mt-2">{stat.value}</p>
                  <p className="text-xs text-white/85 mt-1">{stat.subtext}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex bg-white/90 backdrop-blur rounded-full shadow-lg p-1 border border-white/70">
            <button
              onClick={() => setActiveTab("analyze")}
              className={`px-6 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === "analyze"
                  ? "bg-gradient-to-r from-[#0b1f40] to-[#bf1f24] text-white shadow"
                  : "text-gray-700 hover:bg-white"
              }`}
            >
              Analyze Card
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-6 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === "chat"
                  ? "bg-gradient-to-r from-[#0b1f40] to-[#bf1f24] text-white shadow"
                  : "text-gray-700 hover:bg-white"
              }`}
            >
              Search & Chat
            </button>
            <button
              onClick={() => setActiveTab("collection")}
              className={`px-6 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                activeTab === "collection"
                  ? "bg-gradient-to-r from-[#0b1f40] to-[#bf1f24] text-white shadow"
                  : "text-gray-700 hover:bg-white"
              }`}
            >
              My Collection
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "analyze" && (
          <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl p-8 space-y-6 border border-white/80 max-w-4xl mx-auto">
            <ImageUploader
              onFileSelect={handleFileSelect}
              isDisabled={isAnalyzing}
              currentPreview={preview}
            />

            {/* Optional User Hint */}
            {file && (
              <div className="space-y-2">
                <label
                  htmlFor="userHint"
                  className="block text-sm font-medium text-gray-700"
                >
                  Optional Hint (helps the AI understand the card better)
                </label>
                <input
                  id="userHint"
                  type="text"
                  value={userHint}
                  onChange={(e) => setUserHint(e.target.value)}
                  placeholder="e.g., 'This is a LeBron James rookie card' or 'Focus on the PSA label'"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isAnalyzing}
                />
              </div>
            )}

            {/* Web Search Option */}
            {file && (
              <div className="flex items-center space-x-3">
                <input
                  id="webSearch"
                  type="checkbox"
                  checked={shouldWebSearch}
                  onChange={(e) => setShouldWebSearch(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  disabled={isAnalyzing}
                />
                <label
                  htmlFor="webSearch"
                  className="text-sm text-gray-700 cursor-pointer"
                >
                  Search the web for additional card information (player stats, card history, etc.)
                </label>
              </div>
            )}

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
                      <span>Processing with AI Agent...</span>
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
                          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                        />
                      </svg>
                      <span>Run Agent</span>
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

            {/* Success Message */}
            {uploadSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <svg
                    className="w-5 h-5 text-green-500 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-green-600 font-medium">
                      Agent completed successfully!
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Card validated, certified, described, embedded, and saved to your collection.
                    </p>
                  </div>
                </div>
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

"use client";

import { useEffect, useState } from "react";
import { CardRecord } from "@/types/types";
import Image from "next/image";

export default function CardHistory() {
  const [cards, setCards] = useState<CardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/search");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch cards");
      }

      setCards(data.cards || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cards");
      console.error("Error fetching cards:", err);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: number): string => {
    if (grade === 10) return "text-purple-600 bg-purple-50";
    if (grade >= 9) return "text-green-600 bg-green-50";
    if (grade >= 7) return "text-blue-600 bg-blue-50";
    if (grade >= 5) return "text-yellow-600 bg-yellow-50";
    return "text-gray-600 bg-gray-50";
  };

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Your Card Collection
        </h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your collection...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Your Card Collection
        </h2>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Error: {error}</p>
          <button
            onClick={fetchCards}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="w-full max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">
          Your Card Collection
        </h2>
        <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <p className="text-gray-600 font-medium mb-2">
              No cards in your collection yet
            </p>
            <p className="text-gray-500 text-sm">
              Upload and analyze PSA cards to build your collection
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          Your Card Collection
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-gray-600">
            {cards.length} card{cards.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={fetchCards}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow"
          >
            {/* Card Image */}
            <div className="relative w-full h-48 mb-3 bg-gray-100 rounded overflow-hidden">
              <Image
                src={card.image_path}
                alt={`${card.player_name} ${card.year}`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
            </div>

            {/* Card Details */}
            <div className="space-y-2">
              <h3 className="font-bold text-lg text-gray-800">
                {card.player_name}
              </h3>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {card.year} {card.brand}
                </span>
                <span
                  className={`px-2 py-1 rounded text-sm font-semibold ${getGradeColor(
                    card.psa_grade
                  )}`}
                >
                  PSA {card.psa_grade}
                </span>
              </div>

              {card.set_name && (
                <p className="text-sm text-gray-600">{card.set_name}</p>
              )}

              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Cert: {card.cert_number}
                </p>
                {card.card_number && (
                  <p className="text-xs text-gray-500">
                    Card #: {card.card_number}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

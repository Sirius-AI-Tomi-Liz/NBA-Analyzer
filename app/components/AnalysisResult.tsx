"use client";

import { AnalysisResponse, PSACard } from "@/types/types";

interface AnalysisResultProps {
  result: AnalysisResponse | null;
  isAnalyzing: boolean;
}

export default function AnalysisResult({
  result,
  isAnalyzing,
}: AnalysisResultProps) {
  if (isAnalyzing) {
    return (
      <div className="w-full p-8 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-lg text-blue-700 font-medium">Analyzing card...</p>
        </div>
        <p className="text-sm text-blue-600 text-center mt-2">
          This may take a few seconds
        </p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  if ("error" in result) {
    return (
      <div className="w-full p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <svg
            className="w-6 h-6 text-red-600 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-red-900">
              Image Not Supported
            </h3>
            <p className="text-sm text-red-700 mt-1">{result.reason}</p>
          </div>
        </div>
      </div>
    );
  }

  const card: PSACard = result.data;

  return (
    <div className="w-full p-6 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-start space-x-3 mb-4">
        <svg
          className="w-6 h-6 text-green-600 shrink-0 mt-0.5"
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
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-green-900">
            PSA Card Detected!
          </h3>
          <p className="text-sm text-green-700">
            Successfully extracted card information
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 space-y-3">
        <CardField label="Player Name" value={card.player_name} />
        <CardField label="Year" value={card.year} />
        <CardField label="Brand" value={card.brand} />
        <CardField
          label="PSA Grade"
          value={card.psa_grade.toString()}
          highlight
        />
        <CardField label="Certification #" value={card.cert_number} />
        {card.set_name && <CardField label="Set Name" value={card.set_name} />}
        {card.card_number && (
          <CardField label="Card Number" value={card.card_number} />
        )}
      </div>
    </div>
  );
}

interface CardFieldProps {
  label: string;
  value: string;
  highlight?: boolean;
}

function CardField({ label, value, highlight }: CardFieldProps) {
  return (
    <div
      className={`flex justify-between items-center py-2 border-b border-gray-200 last:border-0 ${
        highlight ? "bg-yellow-50 -mx-2 px-2 rounded" : ""
      }`}
    >
      <span className="text-sm font-medium text-gray-700">{label}:</span>
      <span
        className={`text-sm ${
          highlight ? "font-bold text-yellow-900" : "text-gray-900"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

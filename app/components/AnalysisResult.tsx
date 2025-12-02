"use client";

import Image from "next/image";
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
          <p className="text-lg text-blue-700 font-medium">AI Agent Processing...</p>
        </div>
        <p className="text-sm text-blue-600 text-center mt-2">
          Validating → Certifying → Describing → Synthetic Doc → Audio → Embedding → Saving
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

  const card: any = result.data; // Using any to access extended fields

  return (
    <div className="w-full p-6 bg-green-50 border border-green-200 rounded-lg space-y-4">
      <div className="flex items-start space-x-3">
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
            PSA Card Validated & Certified!
          </h3>
          <p className="text-sm text-green-700">
            Successfully processed by AI agent
          </p>
        </div>
      </div>

      {/* Card Information */}
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
        {card.cert_url && (
          <div className="pt-2">
            <a
              href={card.cert_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              Verify on PSA Website
            </a>
          </div>
        )}
      </div>

      {/* Description */}
      {card.description && (
        <div className="bg-white rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">
            Collector Description
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {card.description}
          </p>
        </div>
      )}

      {/* Audio Narration */}
      {card.audio_narration_path && (
        <div className="bg-white rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
              />
            </svg>
            Audio Description
          </h4>
          <audio controls className="w-full mt-2">
            <source src={card.audio_narration_path} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
          <p className="text-xs text-gray-500 mt-2">
            Professional narration of the card description
          </p>
        </div>
      )}

      {/* Synthetic Document */}
      {card.synthetic_document_path && (
        <div className="bg-white rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Synthetic Document Sample
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            AI-generated sample card with dummy data for demonstration purposes
          </p>
          {card.synthetic_document_path.endsWith(".json") ? (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <p className="text-sm text-gray-600">
                Synthetic card metadata generated. Full image generation requires
                additional Imagen API configuration.
              </p>
              <a
                href={card.synthetic_document_path}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
              >
                View metadata JSON
              </a>
            </div>
          ) : (
            <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={card.synthetic_document_path}
                alt="Synthetic card document"
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 400px"
              />
            </div>
          )}
          {card.synthetic_card_data && (
            <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
              <p className="text-xs font-medium text-purple-800 mb-1">
                Synthetic Card Data (Dummy):
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-purple-700">
                <span>Player: {card.synthetic_card_data.player_name}</span>
                <span>Year: {card.synthetic_card_data.year}</span>
                <span>Brand: {card.synthetic_card_data.brand}</span>
                <span>Grade: PSA {card.synthetic_card_data.psa_grade}</span>
                <span className="col-span-2">
                  Cert #: {card.synthetic_card_data.cert_number}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
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

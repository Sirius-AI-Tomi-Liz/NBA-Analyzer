"use client";

import { useEffect, useMemo, useState } from "react";
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

  const gradeBadgeClass = (grade: number): string => {
    if (grade === 10) return "from-[#a855f7] to-[#ec4899]";
    if (grade >= 9.5) return "from-[#22d3ee] to-[#3b82f6]";
    if (grade >= 9) return "from-[#34d399] to-[#10b981]";
    if (grade >= 8) return "from-[#f97316] to-[#fb7185]";
    return "from-[#9ca3af] to-[#6b7280]";
  };

  const summaryStats = useMemo(() => {
    if (cards.length === 0) {
      return [
        { label: "Cards Tracked", value: "0" },
        { label: "Avg Grade", value: "-" },
        { label: "Brands", value: "-" },
      ];
    }

    const avgGrade =
      cards.reduce((sum, card) => sum + card.psa_grade, 0) / cards.length;
    const brands = new Set(cards.map((card) => card.brand));

    return [
      {
        label: "Cards Tracked",
        value: cards.length.toString(),
      },
      {
        label: "Avg Grade",
        value: avgGrade.toFixed(1),
      },
      {
        label: "Brands",
        value: brands.size.toString(),
      },
    ];
  }, [cards]);

  const CollectionShell = ({
    children,
    footer,
  }: {
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) => (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-white">
      <div className="bg-gradient-to-r from-[#0b1f40] via-[#132d5c] to-[#bf1f24] rounded-3xl border border-white/20 p-6 md:p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/70 mb-2">
              Collection Overview
            </p>
            <h2 className="text-3xl font-black leading-tight">
              Your Card Collection
            </h2>
          </div>
          <div className="flex gap-3">
            <div className="flex items-center gap-2 text-sm text-white/80 bg-white/10 px-4 py-2 rounded-full border border-white/15">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Sync Enabled
            </div>
            <button
              onClick={fetchCards}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-white text-[#0b1f40] shadow-lg hover:shadow-xl transition-all"
            >
              Refresh
            </button>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summaryStats.map((stat) => (
            <div
              key={stat.label}
              className="bg-white/10 border border-white/15 rounded-2xl px-4 py-3 backdrop-blur"
            >
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">
                {stat.label}
              </p>
              <p className="text-3xl font-black mt-1">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white/95 backdrop-blur border border-white/70 rounded-3xl p-6 md:p-8 shadow-xl">
        {children}
        {footer}
      </div>
    </div>
  );

  if (loading) {
    return (
      <CollectionShell>
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-600">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#bf1f24] mx-auto mb-4"></div>
            <p className="text-sm uppercase tracking-[0.3em]">
              Loading your collection
            </p>
          </div>
        </div>
      </CollectionShell>
    );
  }

  if (error) {
    return (
      <CollectionShell>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
          <p className="font-semibold">Unable to load your cards.</p>
          <p className="text-sm mt-1">{error}</p>
          <button
            onClick={fetchCards}
            className="mt-4 px-4 py-2 bg-[#bf1f24] text-white rounded-full hover:bg-[#a0191f] transition-colors text-sm font-semibold"
          >
            Try again
          </button>
        </div>
      </CollectionShell>
    );
  }

  if (cards.length === 0) {
    return (
      <CollectionShell>
        <div className="flex items-center justify-center h-64 border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50">
          <div className="text-center text-gray-600">
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
            <p className="font-semibold mb-2">
              No cards in your vault yet
            </p>
            <p className="text-sm">
              Upload a PSA slab to build your NBA archive.
            </p>
          </div>
        </div>
      </CollectionShell>
    );
  }

  return (
    <CollectionShell
      footer={
        <p className="text-xs text-gray-400 mt-6 text-center">
          Cards automatically sync with the hybrid RAG memory for chat and
          search queries.
        </p>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {cards.map((card) => (
          <div
            key={card.id}
            className="relative overflow-hidden rounded-3xl border border-gray-200/70 bg-white shadow-lg hover:shadow-2xl transition-all group"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-gradient-to-r from-[#0b1f40] via-transparent to-[#bf1f24]" />
            <div className="p-5">
              <div className="relative w-full h-48 mb-4 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 overflow-hidden">
                <Image
                  src={card.image_path}
                  alt={`${card.player_name} ${card.year}`}
                  fill
                  className="object-contain p-2"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-gray-400">
                    {card.brand}
                  </p>
                  <h3 className="text-xl font-black text-gray-900">
                    {card.player_name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {card.year} {card.set_name || ""}
                  </p>
                </div>
                <div
                  className={`bg-gradient-to-r ${gradeBadgeClass(
                    card.psa_grade
                  )} text-white px-3 py-1 rounded-full text-xs font-bold tracking-wide`}
                >
                  PSA {card.psa_grade}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-600">
                <div className="bg-gray-50 rounded-2xl px-3 py-2 border border-gray-100">
                  <p className="uppercase tracking-wider text-[0.6rem] text-gray-400">
                    Certification
                  </p>
                  <p className="font-semibold text-gray-800">
                    {card.cert_number}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl px-3 py-2 border border-gray-100">
                  <p className="uppercase tracking-wider text-[0.6rem] text-gray-400">
                    Card #
                  </p>
                  <p className="font-semibold text-gray-800">
                    {card.card_number || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CollectionShell>
  );
}

"use client";

import { useState, useEffect } from "react";
import { ProductCandidate, SearchConditions } from "../types";
import CandidateForm from "./research/CandidateForm";
import CandidateCard from "./research/CandidateCard";

const CANDIDATES_KEY = "shiire_hantei_candidates";

interface Props {
  yahooAppId: string;
  lastSearch: SearchConditions;
  onOpenSettings: () => void;
  onUseForSimulation: (candidate: ProductCandidate) => void;
}

export default function ResearchTab({
  yahooAppId,
  lastSearch,
  onOpenSettings,
  onUseForSimulation,
}: Props) {
  const [candidates, setCandidates] = useState<ProductCandidate[]>([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CANDIDATES_KEY);
      if (stored) setCandidates(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  const save = (items: ProductCandidate[]) => {
    setCandidates(items);
    try {
      localStorage.setItem(CANDIDATES_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const handleAdd = (candidate: ProductCandidate) => {
    const updated = [candidate, ...candidates].sort(
      (a, b) => b.demandScore - a.demandScore
    );
    save(updated);
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    save(candidates.filter((c) => c.id !== id));
  };

  const sortedCandidates = [...candidates].sort(
    (a, b) => b.demandScore - a.demandScore
  );

  return (
    <div className="space-y-4">
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 border-2 border-dashed border-blue-300 text-blue-600 rounded-2xl font-semibold text-sm hover:bg-blue-50 transition-colors"
        >
          ＋ 候補商品を追加
        </button>
      )}

      {showForm && (
        <CandidateForm
          initialBrand={lastSearch.brand}
          initialCategory={lastSearch.category}
          onAdd={handleAdd}
          onCancel={() => setShowForm(false)}
        />
      )}

      {candidates.length === 0 && !showForm && (
        <div className="text-center py-12 text-slate-400 text-sm bg-white border border-slate-200 rounded-2xl">
          <p className="text-2xl mb-2">📋</p>
          <p>候補商品がまだありません</p>
          <p className="text-xs mt-1">
            メルカリで気になった商品を追加してください
          </p>
        </div>
      )}

      {sortedCandidates.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500">
              候補リスト（需要スコア順）
              <span className="ml-1 font-normal text-slate-400">
                {candidates.length}件
              </span>
            </p>
            <button
              onClick={() => save([])}
              className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 rounded-full px-3 py-1 transition-colors"
            >
              全削除
            </button>
          </div>
          {sortedCandidates.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              yahooAppId={yahooAppId}
              onDelete={handleDelete}
              onOpenSettings={onOpenSettings}
              onUseForSimulation={onUseForSimulation}
            />
          ))}
        </div>
      )}
    </div>
  );
}

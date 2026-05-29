"use client";

import { useState } from "react";
import { ProductCandidate } from "../../types";
import SourcingPanel from "./SourcingPanel";

interface Props {
  candidate: ProductCandidate;
  yahooAppId: string;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
  onUseForSimulation: (candidate: ProductCandidate) => void;
}

const FREQ_LABEL = {
  high: "よく売れている",
  medium: "まあまあ",
  low: "たまに",
};

const SCORE_COLOR = [
  "",
  "text-red-500",
  "text-orange-400",
  "text-yellow-500",
  "text-emerald-500",
  "text-emerald-600",
];

function Stars({ score }: { score: number }) {
  return (
    <span className={`text-lg leading-none ${SCORE_COLOR[score] ?? ""}`}>
      {"★".repeat(score)}
      <span className="text-slate-200">{"★".repeat(5 - score)}</span>
    </span>
  );
}

export default function CandidateCard({
  candidate,
  yahooAppId,
  onDelete,
  onOpenSettings,
  onUseForSimulation,
}: Props) {
  const [open, setOpen] = useState(false);

  const avgPrice = Math.round(
    (candidate.observedPriceMin + candidate.observedPriceMax) / 2
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-bold text-slate-800 truncate">
                {candidate.name}
              </span>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex-shrink-0">
                {candidate.brand}
              </span>
              {candidate.category && (
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full flex-shrink-0">
                  {candidate.category}
                </span>
              )}
            </div>
            {candidate.modelNumber && (
              <p className="text-xs text-slate-400 mb-1">品番：{candidate.modelNumber}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <Stars score={candidate.demandScore} />
              <span className="text-xs text-slate-500">
                需要スコア {candidate.demandScore}/5
              </span>
              <span className="text-xs text-slate-400">
                {FREQ_LABEL[candidate.salesFrequency]}
              </span>
            </div>
          </div>
          <button
            onClick={() => onDelete(candidate.id)}
            className="text-slate-300 hover:text-red-400 transition-colors text-lg flex-shrink-0"
            title="削除"
          >
            ×
          </button>
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
          <span>
            売値 {candidate.observedPriceMin.toLocaleString()}〜
            {candidate.observedPriceMax.toLocaleString()}円
          </span>
          <span>中央値 ¥{avgPrice.toLocaleString()}</span>
        </div>

        {candidate.notes && (
          <p className="mt-2 text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-2">
            {candidate.notes}
          </p>
        )}

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setOpen((v) => !v)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition-colors ${
              open
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-blue-600 border-blue-300 hover:bg-blue-50"
            }`}
          >
            {open ? "▲ 仕入れ先を閉じる" : "🔍 仕入れ先を探す"}
          </button>
          <button
            onClick={() => onUseForSimulation(candidate)}
            className="flex-1 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
          >
            💹 利益シミュレーション
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-4 pb-4">
          <SourcingPanel
            candidate={candidate}
            yahooAppId={yahooAppId}
            onOpenSettings={onOpenSettings}
          />
        </div>
      )}
    </div>
  );
}

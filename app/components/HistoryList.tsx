"use client";

import { HistoryItem, JudgementResult } from "../types";

interface Props {
  history: HistoryItem[];
  onClear: () => void;
}

const JUDGEMENT_LABEL: Record<JudgementResult, { icon: string; label: string; color: string }> = {
  OK: { icon: "✅", label: "仕入れOK", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  NG: { icon: "❌", label: "仕入れNG", color: "text-red-600 bg-red-50 border-red-200" },
  CHECK: { icon: "⚠️", label: "要検討", color: "text-amber-600 bg-amber-50 border-amber-200" },
};

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${mm}/${dd} ${hh}:${min}`;
}

export default function HistoryList({ history, onClear }: Props) {
  if (history.length === 0) {
    return (
      <div className="mt-8 text-center py-8 text-slate-400 text-sm bg-white border border-slate-200 rounded-xl">
        判定履歴はまだありません
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-600">
          判定履歴
          <span className="ml-2 text-slate-400 font-normal">（最新{history.length}件）</span>
        </h2>
        <button
          onClick={onClear}
          className="text-xs text-red-400 hover:text-red-600 border border-red-200 hover:border-red-400 rounded-full px-3 py-1 transition-colors"
        >
          全削除
        </button>
      </div>
      <div className="space-y-2">
        {history.map((item) => {
          const jConfig = JUDGEMENT_LABEL[item.judgement];
          return (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-slate-700 truncate">
                    {item.brand}
                  </span>
                  <span className="text-xs text-slate-400">{item.category}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>{formatDate(item.timestamp)}</span>
                  <span>仕入れ {item.purchasePrice.toLocaleString()}円</span>
                  <span
                    className={item.netProfit >= 0 ? "text-emerald-600" : "text-red-500"}
                  >
                    利益 {item.netProfit >= 0 ? "+" : ""}{item.netProfit.toLocaleString()}円
                  </span>
                </div>
              </div>
              <div
                className={`flex-shrink-0 text-xs font-semibold border rounded-full px-2.5 py-1 ${jConfig.color}`}
              >
                {jConfig.icon} {jConfig.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

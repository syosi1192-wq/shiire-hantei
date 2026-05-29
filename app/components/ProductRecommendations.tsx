"use client";

import { Recommendation } from "../types";

interface Props {
  recommendations: Recommendation[];
  marketSummary?: string;
  activeKeyword: string;
  onSelect: (rec: Recommendation) => void;
}

const DEMAND_STYLE = {
  高: { badge: "bg-red-100 text-red-700 border-red-200", ring: "ring-red-200" },
  中: { badge: "bg-yellow-100 text-yellow-700 border-yellow-200", ring: "ring-yellow-200" },
  低: { badge: "bg-slate-100 text-slate-600 border-slate-200", ring: "ring-slate-200" },
};

export default function ProductRecommendations({
  recommendations,
  marketSummary,
  activeKeyword,
  onSelect,
}: Props) {
  return (
    <div className="space-y-3">
      {marketSummary && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <span className="text-base flex-shrink-0">📊</span>
          <p className="text-xs text-blue-700 leading-relaxed">
            <span className="font-semibold">市場動向：</span>
            {marketSummary}
          </p>
        </div>
      )}

      <p className="text-xs text-slate-500 font-medium">
        AIが断定した仕入れ候補商品（需要順）
      </p>

      {recommendations.map((rec, i) => {
        const style = DEMAND_STYLE[rec.demandLevel] ?? DEMAND_STYLE["中"];
        const isActive = activeKeyword === rec.searchKeyword;
        const grossMargin =
          rec.estimatedSellPrice > 0
            ? Math.round(
                ((rec.estimatedSellPrice -
                  Math.round(rec.estimatedSellPrice * 0.1) -
                  750 -
                  rec.purchaseTargetPrice) /
                  rec.estimatedSellPrice) *
                  100
              )
            : 0;

        return (
          <div
            key={i}
            className={`bg-white rounded-2xl overflow-hidden transition-all border-2 ${
              isActive
                ? "border-emerald-400 shadow-lg shadow-emerald-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            {isActive && (
              <div className="bg-emerald-500 text-white text-xs font-bold text-center py-1.5">
                ✓ この商品をヤフオクで検索中
              </div>
            )}

            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-slate-400">#{i + 1}</span>
                    <h3 className="text-sm font-bold text-slate-800 leading-tight">
                      {rec.name}
                    </h3>
                  </div>
                  {rec.modelNumber && (
                    <p className="text-xs text-slate-400 font-mono">
                      品番：{rec.modelNumber}
                    </p>
                  )}
                </div>
                <span
                  className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${style.badge}`}
                >
                  需要 {rec.demandLevel}
                </span>
              </div>

              {/* Reason */}
              <p className="text-xs text-slate-600 leading-relaxed mb-3 bg-slate-50 rounded-lg px-3 py-2">
                💡 {rec.reason}
              </p>

              {/* Price estimates */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-slate-50 rounded-xl px-2 py-2 text-center">
                  <p className="text-xs text-slate-400 mb-0.5">メルカリ売値</p>
                  <p className="text-sm font-bold text-slate-700">
                    ¥{rec.estimatedSellPrice.toLocaleString()}
                  </p>
                </div>
                <div className="bg-emerald-50 rounded-xl px-2 py-2 text-center">
                  <p className="text-xs text-emerald-600 mb-0.5">目標仕入れ</p>
                  <p className="text-sm font-bold text-emerald-700">
                    ¥{rec.purchaseTargetPrice.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`rounded-xl px-2 py-2 text-center ${
                    grossMargin >= 20
                      ? "bg-blue-50"
                      : grossMargin >= 10
                      ? "bg-yellow-50"
                      : "bg-red-50"
                  }`}
                >
                  <p className="text-xs text-slate-500 mb-0.5">概算利益率</p>
                  <p
                    className={`text-sm font-bold ${
                      grossMargin >= 20
                        ? "text-blue-700"
                        : grossMargin >= 10
                        ? "text-yellow-700"
                        : "text-red-600"
                    }`}
                  >
                    {grossMargin}%
                  </p>
                </div>
              </div>

              {/* Tips */}
              {rec.tips && (
                <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3">
                  <span className="text-amber-500 text-sm flex-shrink-0">⚠</span>
                  <p className="text-xs text-amber-700 leading-relaxed">{rec.tips}</p>
                </div>
              )}

              {/* Action button */}
              <button
                onClick={() => onSelect(rec)}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                  isActive
                    ? "bg-emerald-600 text-white cursor-default"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {isActive
                  ? "✓ ヤフオクで検索中 ↓"
                  : `🔍 「${rec.name}」をヤフオクで探す`}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

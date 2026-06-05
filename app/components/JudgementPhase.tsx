"use client";

import { useState, useEffect, useRef } from "react";
import { SearchConditions, HistoryItem, JudgementResult } from "../types";

export interface JudgeParams {
  purchasePrice: number;
  itemTitle: string;
  itemUrl: string;
  search: SearchConditions;
  targetMarginRate: number;
}

interface Props extends JudgeParams {
  onBack: () => void;
  onSaveHistory: (item: HistoryItem) => void;
}

const SHIPPING_PRESETS = [
  { label: "ネコポス", value: 210 },
  { label: "コンパクト", value: 750 },
  { label: "宅急便", value: 1000 },
];

const JUDGEMENT_CONFIG = {
  OK: {
    icon: "✅",
    label: "仕入れOK",
    sub: "目標利益率を達成しています",
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-700",
    bar: "bg-emerald-500",
  },
  NG: {
    icon: "❌",
    label: "仕入れNG",
    sub: "赤字または利益率が極端に低い",
    bg: "bg-red-50",
    border: "border-red-300",
    text: "text-red-700",
    bar: "bg-red-400",
  },
  CHECK: {
    icon: "⚠️",
    label: "要検討",
    sub: "利益は出るが目標利益率に届かない",
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-700",
    bar: "bg-amber-400",
  },
};

export default function JudgementPhase({
  purchasePrice: initialPrice,
  itemTitle,
  itemUrl,
  search,
  targetMarginRate,
  onBack,
  onSaveHistory,
}: Props) {
  const [purchasePrice, setPurchasePrice] = useState(initialPrice);
  const [shippingCost, setShippingCost] = useState(750);
  const [customMode, setCustomMode] = useState(false);
  const savedRef = useRef(false);

  const estimatedPrice = Math.round((search.priceMin + search.priceMax) / 2);
  const commission = Math.round(estimatedPrice * 0.1);
  const netProfit = estimatedPrice - commission - shippingCost - purchasePrice;
  const marginRate = estimatedPrice > 0 ? (netProfit / estimatedPrice) * 100 : 0;

  let judgement: JudgementResult;
  if (netProfit < 0) judgement = "NG";
  else if (marginRate >= targetMarginRate) judgement = "OK";
  else if (marginRate > 0) judgement = "CHECK";
  else judgement = "NG";

  const cfg = JUDGEMENT_CONFIG[judgement];

  // Save to history on first render
  useEffect(() => {
    if (!savedRef.current && estimatedPrice > 0 && initialPrice > 0) {
      savedRef.current = true;
      const calc = (() => {
        const np = estimatedPrice - commission - 750 - initialPrice;
        const mr = (np / estimatedPrice) * 100;
        let j: JudgementResult;
        if (np < 0) j = "NG";
        else if (mr >= targetMarginRate) j = "OK";
        else if (mr > 0) j = "CHECK";
        else j = "NG";
        return { np, mr, j };
      })();
      onSaveHistory({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        brand: search.brand,
        category: search.category,
        purchasePrice: initialPrice,
        judgement: calc.j,
        marginRate: calc.mr,
        netProfit: calc.np,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:text-blue-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          仕入れ先検索に戻る
        </button>
      </div>

      {/* Item info */}
      {itemTitle && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <p className="text-xs text-slate-400 mb-1">判定対象の商品</p>
          {itemUrl ? (
            <a
              href={itemUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-blue-600 hover:underline line-clamp-2"
            >
              {itemTitle} ↗
            </a>
          ) : (
            <p className="text-sm font-medium text-slate-700">{itemTitle}</p>
          )}
        </div>
      )}

      {/* Inputs */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            仕入れ予定価格
          </label>
          <div className="relative">
            <input
              type="number"
              value={purchasePrice || ""}
              onChange={(e) => setPurchasePrice(Number(e.target.value))}
              min={0}
              className="w-full pl-4 pr-8 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">円</span>
          </div>
          {itemUrl && (
            <p className="text-xs text-slate-400 mt-1">
              ※ 入札形式の場合、終了時の価格で変わります
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">送料</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {SHIPPING_PRESETS.map((p) => (
              <button
                key={p.value}
                onClick={() => { setShippingCost(p.value); setCustomMode(false); }}
                className={`py-2 rounded-lg border text-xs font-semibold transition-colors ${
                  shippingCost === p.value && !customMode
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
                }`}
              >
                <div>{p.label}</div>
                <div className={shippingCost === p.value && !customMode ? "text-blue-200" : "text-slate-400"}>
                  {p.value}円
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => setCustomMode(true)}
            className={`w-full py-2 rounded-lg border text-xs font-semibold transition-colors mb-2 ${
              customMode
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
            }`}
          >
            カスタム入力
          </button>
          {customMode && (
            <div className="relative">
              <input
                type="number"
                value={shippingCost || ""}
                onChange={(e) => setShippingCost(Number(e.target.value))}
                placeholder="送料を入力"
                min={0}
                className="w-full pl-4 pr-8 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">円</span>
            </div>
          )}
        </div>
      </div>

      {/* Judgement result */}
      <div className={`${cfg.bg} ${cfg.border} border-2 rounded-2xl p-5 text-center`}>
        <div className="text-5xl mb-2">{cfg.icon}</div>
        <div className={`text-2xl font-bold ${cfg.text} mb-1`}>{cfg.label}</div>
        <div className={`text-xs ${cfg.text} opacity-75`}>{cfg.sub}</div>
      </div>

      {/* Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
          <h3 className="text-xs font-semibold text-slate-600">収支内訳</h3>
        </div>
        <div className="divide-y divide-slate-100">
          <Row label="想定売値（メルカリ中央値）" value={`¥${estimatedPrice.toLocaleString()}`} />
          <Row label="メルカリ手数料（10%）" value={`-¥${commission.toLocaleString()}`} sub />
          <Row label="送料" value={`-¥${shippingCost.toLocaleString()}`} sub />
          <Row label="仕入れ値" value={`-¥${purchasePrice.toLocaleString()}`} sub />
          <div className="px-4 py-3 flex justify-between items-center bg-slate-50">
            <span className="text-sm font-bold text-slate-700">純利益</span>
            <span
              className={`text-xl font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}
            >
              {netProfit >= 0 ? "+" : ""}¥{netProfit.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-slate-600">利益率</span>
            <span className={`text-2xl font-bold ${marginRate >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {marginRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>目標利益率：{targetMarginRate}%</span>
            <span>差：{(marginRate - targetMarginRate).toFixed(1)}%</span>
          </div>
          <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            {/* Target marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-400 z-10"
              style={{ left: `${Math.min(targetMarginRate, 100)}%` }}
            />
            {/* Progress */}
            <div
              className={`h-3 rounded-full transition-all ${cfg.bar}`}
              style={{ width: `${Math.min(Math.max(marginRate, 0), 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-300 mt-1">
            <span>0%</span>
            <span className="text-blue-400">目標 {targetMarginRate}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Mercari price reference */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-500">
        <span className="font-medium">メルカリ観測価格：</span>
        {search.priceMin.toLocaleString()}〜{search.priceMax.toLocaleString()}円
        {search.brand && (
          <span className="ml-2">
            （{search.brand}{search.category ? ` ${search.category}` : ""}）
          </span>
        )}
      </div>

      <button
        onClick={onBack}
        className="w-full py-3 border-2 border-stone-300 text-stone-600 rounded-xl font-semibold text-sm hover:bg-stone-100 hover:border-stone-400 transition-colors tracking-wide"
      >
        ← 別の商品を探す
      </button>
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: boolean }) {
  return (
    <div className="px-4 py-3 flex justify-between items-center">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-medium ${sub ? "text-slate-500" : "text-slate-800"}`}>
        {value}
      </span>
    </div>
  );
}

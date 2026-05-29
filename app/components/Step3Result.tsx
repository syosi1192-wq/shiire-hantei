"use client";

import { CalculationResult, SearchConditions, SimulationSettings } from "../types";

interface Props {
  result: CalculationResult;
  search: SearchConditions;
  simulation: SimulationSettings;
  onReset: () => void;
  onBack: () => void;
}

const JUDGEMENT_CONFIG = {
  OK: {
    icon: "✅",
    label: "仕入れOK",
    description: "目標利益率を達成しています！",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-300",
    textColor: "text-emerald-700",
    badgeBg: "bg-emerald-100",
  },
  NG: {
    icon: "❌",
    label: "仕入れNG",
    description: "赤字または目標利益率を大きく下回っています",
    bgColor: "bg-red-50",
    borderColor: "border-red-300",
    textColor: "text-red-700",
    badgeBg: "bg-red-100",
  },
  CHECK: {
    icon: "⚠️",
    label: "要検討",
    description: "利益は出ますが、目標利益率には届きません",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-300",
    textColor: "text-amber-700",
    badgeBg: "bg-amber-100",
  },
};

export default function Step3Result({ result, search, simulation, onReset, onBack }: Props) {
  const config = JUDGEMENT_CONFIG[result.judgement];

  return (
    <div className="space-y-5">
      <div
        className={`${config.bgColor} ${config.borderColor} border-2 rounded-xl p-6 text-center`}
      >
        <div className="text-5xl mb-2">{config.icon}</div>
        <div className={`text-2xl font-bold ${config.textColor} mb-1`}>
          {config.label}
        </div>
        <div className={`text-sm ${config.textColor} opacity-80`}>
          {config.description}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-600">収支内訳</h3>
        </div>
        <div className="divide-y divide-slate-100">
          <Row label="想定売値（中央値）" value={`${result.estimatedPrice.toLocaleString()}円`} />
          <Row
            label="メルカリ手数料（10%）"
            value={`-${result.mercariCommission.toLocaleString()}円`}
            negative
          />
          <Row
            label="送料"
            value={`-${result.shippingCost.toLocaleString()}円`}
            negative
          />
          <Row
            label="仕入れ値"
            value={`-${simulation.purchasePrice.toLocaleString()}円`}
            negative
          />
          <div className="px-4 py-3 flex justify-between items-center bg-slate-50">
            <span className="text-sm font-bold text-slate-700">純利益</span>
            <span
              className={`text-lg font-bold ${
                result.netProfit >= 0 ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {result.netProfit >= 0 ? "+" : ""}
              {result.netProfit.toLocaleString()}円
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-600">利益率</h3>
        </div>
        <div className="px-4 py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-600">実際の利益率</span>
            <span
              className={`text-xl font-bold ${
                result.marginRate >= 0 ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {result.marginRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-slate-600">目標利益率</span>
            <span className="text-xl font-bold text-blue-600">
              {simulation.targetMarginRate.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all ${
                result.marginRate >= simulation.targetMarginRate
                  ? "bg-emerald-500"
                  : result.marginRate > 0
                  ? "bg-amber-400"
                  : "bg-red-400"
              }`}
              style={{
                width: `${Math.min(Math.max(result.marginRate, 0), 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>0%</span>
            <span>目標 {simulation.targetMarginRate}%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-slate-500 mb-2">検索条件</h3>
        <div className="flex flex-wrap gap-2">
          <Tag label={search.brand} />
          <Tag label={search.category} />
          {search.modelNumber && <Tag label={search.modelNumber} />}
          <Tag label={`${search.priceMin.toLocaleString()}〜${search.priceMax.toLocaleString()}円`} />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-slate-300 text-slate-600 rounded-lg font-semibold hover:bg-slate-100 transition-colors"
        >
          設定を変更
        </button>
        <button
          onClick={onReset}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          新しく判定する
        </button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="px-4 py-3 flex justify-between items-center">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-sm font-medium ${negative ? "text-slate-500" : "text-slate-800"}`}>
        {value}
      </span>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="inline-block bg-white border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-600">
      {label}
    </span>
  );
}

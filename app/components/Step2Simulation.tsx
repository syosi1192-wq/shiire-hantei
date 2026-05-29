"use client";

import { useState } from "react";
import { SimulationSettings } from "../types";

interface Props {
  data: SimulationSettings;
  estimatedPrice: number;
  onChange: (data: SimulationSettings) => void;
  onNext: () => void;
  onBack: () => void;
}

const SHIPPING_PRESETS = [
  { label: "ネコポス (210円)", value: 210 },
  { label: "宅急便コンパクト (750円)", value: 750 },
  { label: "宅急便 (1,000円)", value: 1000 },
];

export default function Step2Simulation({ data, estimatedPrice, onChange, onNext, onBack }: Props) {
  const [shippingMode, setShippingMode] = useState<"preset" | "custom">(
    SHIPPING_PRESETS.some((p) => p.value === data.shippingCost) ? "preset" : "custom"
  );

  const update = (field: keyof SimulationSettings, value: number) => {
    onChange({ ...data, [field]: value });
  };

  const handleShippingPreset = (value: number) => {
    setShippingMode("preset");
    update("shippingCost", value);
  };

  const commission = Math.round(estimatedPrice * 0.1);
  const netProfit = estimatedPrice - commission - data.shippingCost - data.purchasePrice;
  const marginRate = estimatedPrice > 0 ? (netProfit / estimatedPrice) * 100 : 0;

  const isValid = data.purchasePrice > 0 && data.shippingCost >= 0 && data.targetMarginRate > 0;

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          仕入れ予定価格 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="number"
            value={data.purchasePrice || ""}
            onChange={(e) => update("purchasePrice", Number(e.target.value))}
            placeholder="例：5000"
            min={0}
            className="w-full pl-4 pr-8 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">円</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          送料設定 <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2 mb-2">
          {SHIPPING_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleShippingPreset(preset.value)}
              className={`py-2 px-2 text-xs font-medium rounded-lg border transition-colors ${
                shippingMode === "preset" && data.shippingCost === preset.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShippingMode("custom")}
          className={`w-full py-2 text-sm font-medium rounded-lg border transition-colors mb-2 ${
            shippingMode === "custom"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
          }`}
        >
          カスタム入力
        </button>
        {shippingMode === "custom" && (
          <div className="relative">
            <input
              type="number"
              value={data.shippingCost || ""}
              onChange={(e) => update("shippingCost", Number(e.target.value))}
              placeholder="送料を入力"
              min={0}
              className="w-full pl-4 pr-8 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">円</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          メルカリ販売手数料
        </label>
        <div className="w-full px-4 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 flex justify-between">
          <span>固定 10%（自動計算）</span>
          {estimatedPrice > 0 && (
            <span className="font-medium text-slate-700">
              {commission.toLocaleString()}円
            </span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          目標利益率 <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="number"
            value={data.targetMarginRate || ""}
            onChange={(e) => update("targetMarginRate", Number(e.target.value))}
            placeholder="例：20"
            min={0}
            max={100}
            className="w-full pl-4 pr-8 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
        </div>
      </div>

      {estimatedPrice > 0 && data.purchasePrice > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <p className="text-xs font-medium text-blue-600 mb-2">現在の試算</p>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">想定売値</span>
              <span className="font-medium">{estimatedPrice.toLocaleString()}円</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">純利益</span>
              <span className={`font-medium ${netProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {netProfit.toLocaleString()}円
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">利益率</span>
              <span className={`font-medium ${marginRate >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {marginRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBack}
          className="flex-1 py-3 border border-slate-300 text-slate-600 rounded-lg font-semibold hover:bg-slate-100 transition-colors"
        >
          戻る
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          判定する
        </button>
      </div>
    </div>
  );
}

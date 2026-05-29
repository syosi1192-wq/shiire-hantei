"use client";

import { useState } from "react";
import { ProductCandidate, SalesFrequency } from "../../types";

interface Props {
  initialBrand?: string;
  initialCategory?: string;
  onAdd: (candidate: ProductCandidate) => void;
  onCancel: () => void;
}

const FREQ_OPTIONS: { value: SalesFrequency; label: string; desc: string }[] = [
  { value: "high", label: "よく売れている", desc: "出品してすぐ売れる" },
  { value: "medium", label: "まあまあ", desc: "数日以内に売れる" },
  { value: "low", label: "たまに", desc: "時間がかかることも" },
];

function calcDemandScore(freq: SalesFrequency, avgPrice: number): number {
  const freqScore = { high: 3, medium: 2, low: 1 }[freq];
  const priceBonus = avgPrice >= 30000 ? 2 : avgPrice >= 10000 ? 1 : 0;
  return Math.min(5, freqScore + priceBonus);
}

export default function CandidateForm({ initialBrand = "", initialCategory = "", onAdd, onCancel }: Props) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState(initialBrand);
  const [category, setCategory] = useState(initialCategory);
  const [modelNumber, setModelNumber] = useState("");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [salesFrequency, setSalesFrequency] = useState<SalesFrequency>("medium");
  const [notes, setNotes] = useState("");

  const isValid =
    name.trim() !== "" &&
    brand.trim() !== "" &&
    priceMin > 0 &&
    priceMax >= priceMin;

  const handleSubmit = () => {
    if (!isValid) return;
    const avgPrice = (priceMin + priceMax) / 2;
    const demandScore = calcDemandScore(salesFrequency, avgPrice);
    const candidate: ProductCandidate = {
      id: Date.now().toString(),
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      modelNumber: modelNumber.trim(),
      observedPriceMin: priceMin,
      observedPriceMax: priceMax,
      salesFrequency,
      notes: notes.trim(),
      demandScore,
      addedAt: new Date().toISOString(),
    };
    onAdd(candidate);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-slate-700">候補商品を追加</h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            商品名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：コーチ シグネチャー トート"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            ブランド <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="コーチ"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">カテゴリ</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="バッグ"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">品番・型式</label>
          <input
            type="text"
            value={modelNumber}
            onChange={(e) => setModelNumber(e.target.value)}
            placeholder="例：F12345"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          メルカリで観測した売値 <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="number"
              value={priceMin || ""}
              onChange={(e) => setPriceMin(Number(e.target.value))}
              placeholder="最小"
              min={0}
              className="w-full pl-3 pr-7 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">円</span>
          </div>
          <span className="text-slate-400 text-sm">〜</span>
          <div className="relative flex-1">
            <input
              type="number"
              value={priceMax || ""}
              onChange={(e) => setPriceMax(Number(e.target.value))}
              placeholder="最大"
              min={0}
              className="w-full pl-3 pr-7 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">円</span>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">
          メルカリでの売れ行き <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {FREQ_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSalesFrequency(opt.value)}
              className={`py-2 px-1 rounded-lg border text-center transition-colors ${
                salesFrequency === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
              }`}
            >
              <div className="text-xs font-semibold">{opt.label}</div>
              <div className={`text-xs mt-0.5 ${salesFrequency === opt.value ? "text-blue-100" : "text-slate-400"}`}>
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">メモ</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="気になった点・コンディション・補足など"
          rows={2}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white resize-none"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors"
        >
          キャンセル
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          候補に追加
        </button>
      </div>
    </div>
  );
}

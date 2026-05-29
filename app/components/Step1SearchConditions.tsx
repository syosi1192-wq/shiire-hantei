"use client";

import { SearchConditions } from "../types";

interface Props {
  data: SearchConditions;
  onChange: (data: SearchConditions) => void;
  onNext: () => void;
}

export default function Step1SearchConditions({ data, onChange, onNext }: Props) {
  const update = (field: keyof SearchConditions, value: string | number) => {
    onChange({ ...data, [field]: value });
  };

  const isValid =
    data.brand.trim() !== "" &&
    data.category.trim() !== "" &&
    data.priceMin >= 0 &&
    data.priceMax > 0 &&
    data.priceMax >= data.priceMin;

  const canSearch = data.brand.trim() !== "" || data.category.trim() !== "";

  const buildMercariUrl = () => {
    const keyword = [data.brand, data.category, data.modelNumber]
      .filter(Boolean)
      .join(" ")
      .trim();
    const params = new URLSearchParams({ keyword });
    if (data.priceMin > 0) params.set("price_min", String(data.priceMin));
    if (data.priceMax > 0) params.set("price_max", String(data.priceMax));
    params.set("status", "sold_out"); // 売り切れ済み＝取引実績
    return `https://jp.mercari.com/search?${params.toString()}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          ブランド名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.brand}
          onChange={(e) => update("brand", e.target.value)}
          placeholder="例：コーチ、グッチ、ルイヴィトン"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          商品カテゴリ <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.category}
          onChange={(e) => update("category", e.target.value)}
          placeholder="例：バッグ、財布、アクセサリー"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          メルカリ取引価格の範囲 <span className="text-red-500">*</span>
        </label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="number"
              value={data.priceMin || ""}
              onChange={(e) => update("priceMin", Number(e.target.value))}
              placeholder="最小"
              min={0}
              className="w-full pl-4 pr-8 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">円</span>
          </div>
          <span className="text-slate-400 font-medium">〜</span>
          <div className="relative flex-1">
            <input
              type="number"
              value={data.priceMax || ""}
              onChange={(e) => update("priceMax", Number(e.target.value))}
              placeholder="最大"
              min={0}
              className="w-full pl-4 pr-8 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">円</span>
          </div>
        </div>
        {data.priceMin > 0 && data.priceMax > 0 && data.priceMax < data.priceMin && (
          <p className="text-red-500 text-xs mt-1">最大値は最小値以上にしてください</p>
        )}
        {data.priceMin > 0 && data.priceMax > 0 && data.priceMax >= data.priceMin && (
          <p className="text-slate-400 text-xs mt-1">
            中央値（想定売値）：{Math.round((data.priceMin + data.priceMax) / 2).toLocaleString()}円
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          型式・品番
          <span className="text-slate-400 text-xs ml-1">（任意）</span>
        </label>
        <input
          type="text"
          value={data.modelNumber}
          onChange={(e) => update("modelNumber", e.target.value)}
          placeholder="例：F12345、GG-001"
          className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white"
        />
      </div>

      {canSearch && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-3">
            メルカリで実際の取引価格を確認してから、上の価格帯に入力してください。
            <br />
            <span className="text-slate-400">※「売り切れ」で絞り込んだ実績価格が表示されます</span>
          </p>
          <a
            href={buildMercariUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
            メルカリで「{[data.brand, data.category, data.modelNumber].filter(Boolean).join(" ")}」を検索
            <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}

      <div className="pt-2">
        <button
          onClick={onNext}
          disabled={!isValid}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold text-base hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          次へ：利益シミュレーション設定
        </button>
      </div>
    </div>
  );
}

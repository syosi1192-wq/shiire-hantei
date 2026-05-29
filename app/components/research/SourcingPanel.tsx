"use client";

import { useState, useEffect } from "react";
import { ProductCandidate, YahooAuctionItem } from "../../types";

interface Props {
  candidate: ProductCandidate;
  yahooAppId: string;
  onOpenSettings: () => void;
}

const PLATFORMS = [
  {
    name: "ヤフオク",
    color: "bg-red-50 border-red-200 text-red-700",
    buildUrl: (kw: string) =>
      `https://auctions.yahoo.co.jp/search/search?p=${encodeURIComponent(kw)}&va=${encodeURIComponent(kw)}`,
  },
  {
    name: "セカンドストリート",
    color: "bg-green-50 border-green-200 text-green-700",
    buildUrl: (kw: string) =>
      `https://www.2ndstreet.jp/goods/list?keyword=${encodeURIComponent(kw)}`,
  },
  {
    name: "ハードオフ",
    color: "bg-orange-50 border-orange-200 text-orange-700",
    buildUrl: (kw: string) =>
      `https://www.hardoff.co.jp/search/?s=${encodeURIComponent(kw)}`,
  },
  {
    name: "ラクマ",
    color: "bg-pink-50 border-pink-200 text-pink-700",
    buildUrl: (kw: string) =>
      `https://fril.jp/search?query=${encodeURIComponent(kw)}`,
  },
  {
    name: "PayPayフリマ",
    color: "bg-yellow-50 border-yellow-200 text-yellow-700",
    buildUrl: (kw: string) =>
      `https://paypayfleamarket.yahoo.co.jp/search/${encodeURIComponent(kw)}`,
  },
];

function timeRemaining(endTimeStr: string): string {
  if (!endTimeStr) return "";
  const end = new Date(endTimeStr);
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return "終了";
  const days = Math.floor(diff / 86400000);
  if (days > 0) return `残り${days}日`;
  const hours = Math.floor(diff / 3600000);
  if (hours > 0) return `残り${hours}時間`;
  const mins = Math.floor(diff / 60000);
  return `残り${mins}分`;
}

export default function SourcingPanel({ candidate, yahooAppId, onOpenSettings }: Props) {
  const [items, setItems] = useState<YahooAuctionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);

  const keyword = [candidate.brand, candidate.name, candidate.modelNumber]
    .filter(Boolean)
    .join(" ");

  useEffect(() => {
    if (!yahooAppId) return;
    setLoading(true);
    setError("");
    fetch(`/api/yahoo-auctions?query=${encodeURIComponent(keyword)}&appId=${encodeURIComponent(yahooAppId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setItems(data.items ?? []);
          setTotal(data.total ?? 0);
        }
      })
      .catch(() => setError("通信エラーが発生しました"))
      .finally(() => setLoading(false));
  }, [keyword, yahooAppId]);

  return (
    <div className="space-y-4 mt-3">
      {/* External links */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-2">仕入れ先サイトで検索</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PLATFORMS.map((p) => (
            <a
              key={p.name}
              href={p.buildUrl(keyword)}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center justify-between gap-1 px-3 py-2 rounded-lg border text-xs font-semibold transition-opacity hover:opacity-80 ${p.color}`}
            >
              <span>{p.name}</span>
              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ))}
        </div>
      </div>

      {/* Yahoo Auctions API results */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500">
            ヤフオク リアルタイム出品
            {total > 0 && <span className="ml-1 text-slate-400 font-normal">（{total.toLocaleString()}件）</span>}
          </p>
          {!yahooAppId && (
            <button
              onClick={onOpenSettings}
              className="text-xs text-blue-600 underline"
            >
              APIキーを設定
            </button>
          )}
        </div>

        {!yahooAppId && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-500 mb-2">
              Yahoo! Japan APIキーを設定するとリアルタイムの出品情報を表示できます
            </p>
            <button
              onClick={onOpenSettings}
              className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              ⚙️ APIキーを設定する
            </button>
          </div>
        )}

        {yahooAppId && loading && (
          <div className="text-center py-6 text-slate-400 text-sm">
            <div className="inline-block w-5 h-5 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin mb-2" />
            <p>取得中...</p>
          </div>
        )}

        {yahooAppId && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-xs text-red-600 mb-2">{error}</p>
            <p className="text-xs text-slate-400">APIキーを確認してください</p>
          </div>
        )}

        {yahooAppId && !loading && !error && items.length === 0 && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-400">「{keyword}」の出品が見つかりませんでした</p>
          </div>
        )}

        {yahooAppId && !loading && items.length > 0 && (
          <div className="space-y-2">
            {items.map((item) => (
              <a
                key={item.auctionId}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-3 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="w-14 h-14 object-cover rounded-lg flex-shrink-0 bg-slate-100"
                  />
                ) : (
                  <div className="w-14 h-14 bg-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center text-slate-300 text-xs">
                    画像なし
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 font-medium line-clamp-2 mb-1">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-slate-800">
                      ¥{item.currentPrice.toLocaleString()}
                    </span>
                    {item.bids > 0 && (
                      <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                        {item.bids}入札
                      </span>
                    )}
                    {item.endTime && (
                      <span className="text-xs text-slate-400">
                        {timeRemaining(item.endTime)}
                      </span>
                    )}
                  </div>
                </div>
                <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { SearchConditions, YahooAuctionItem, Recommendation } from "../types";
import ProductRecommendations from "./ProductRecommendations";
import ImageSearchPanel from "./ImageSearchPanel";

interface JudgeParams {
  purchasePrice: number;
  itemTitle: string;
  itemUrl: string;
  search: SearchConditions;
  targetMarginRate: number;
}

interface MercariTopProduct {
  name: string;
  priceRange: string;
  priceMin: number;
  priceMax: number;
  salesFrequency: string;
  recentCount: number;
  reason: string;
  searchKeyword: string;
}

interface MercariAnalysisResult {
  topProducts: MercariTopProduct[];
  summary: string;
  bestBuyTarget: string;
}

interface Props {
  onJudge: (params: JudgeParams) => void;
}

/**
 * ヤフオク出品タイトルから、ブランド名・商品名・色など
 * 商品を特定する情報のみ残してメルカリ検索用に整形する。
 */
function cleanTitleForMercari(title: string): string {
  let s = title;

  // 1. 装飾記号・絵文字を除去
  s = s.replace(
    /[◆◇■□●○▲△▽▼★☆♪♬♦♣♠♥♡♢♤✨💫⭐❤️🎀🎁！？〜「」『』【】〔〕（）・※＊＃＠／＼｜]/gu,
    " "
  );
  s = s.replace(/[!?~()\[\]{}<>@#*|/\\]/g, " ");

  // 2. 販促・状態・用途を表す不要語を除去
  const junk = [
    "可愛いです", "かわいいです", "可愛い", "かわいい", "オシャレ",
    "美品", "良品", "極美品", "超美品", "未使用品", "送料無料",
    "即決", "即購入OK", "即購入", "匿名配送", "追跡あり",
    "国内正規品", "正規品", "並行輸入品", "本物", "鑑定済",
    "お仕事", "通勤", "通学", "学生", "会社", "オフィス",
    "プレゼント", "ギフト", "記念日", "誕生日", "クリスマス",
    "ポイント利用", "爆買", "人気", "セール", "SALE",
    "A4対応", "対応", "あすつく",
  ];
  for (const w of junk) {
    s = s.replace(new RegExp(w, "g"), " ");
  }

  // 3. 5桁以上の純粋な数字（商品管理番号など）を除去
  s = s.replace(/\b\d{5,}\b/g, " ");

  // 4. 連続スペースを整理
  s = s.replace(/\s{2,}/g, " ").trim();

  // 5. 先頭から最大6語に絞る（商品特定情報は前半に集中）
  const words = s.split(/\s+/).filter((w) => w.length > 0);
  return words.slice(0, 6).join(" ");
}

const MERCARI_CONDITIONS = [
  { value: "1", label: "新品・未使用" },
  { value: "2", label: "未使用に近い" },
  { value: "3", label: "傷・汚れなし" },
  { value: "4", label: "やや傷あり" },
  { value: "5", label: "傷・汚れあり" },
  { value: "6", label: "状態が悪い" },
];

const YAHOO_CONDITIONS = [
  { value: "", label: "すべて" },
  { value: "new", label: "新品" },
  { value: "used", label: "中古" },
];

const PLATFORMS = [
  {
    // ジモティー：ログイン不要・地域の格安品が多い
    name: "ジモティー",
    color: "bg-green-50 border-green-200 text-green-700",
    url: (kw: string) =>
      `https://jmty.jp/all/sale?keyword=${encodeURIComponent(kw)}`,
  },
  {
    // オフモール：ハードオフ系列のオンラインショップ（?q= が正しいパラメーター）
    name: "オフモール(ハードオフ)",
    color: "bg-orange-50 border-orange-200 text-orange-700",
    url: (kw: string) =>
      `https://netmall.hardoff.co.jp/search/?q=${encodeURIComponent(kw)}`,
  },
  {
    // Yahoo!フリマ（旧PayPayフリマ）
    name: "Yahoo!フリマ",
    color: "bg-yellow-50 border-yellow-200 text-yellow-700",
    url: (kw: string) =>
      `https://paypayfleamarket.yahoo.co.jp/search/${encodeURIComponent(kw)}`,
  },
  {
    // Amazon：中古品の価格相場確認・仕入れ参考に
    name: "Amazon",
    color: "bg-blue-50 border-blue-200 text-blue-700",
    url: (kw: string) =>
      `https://www.amazon.co.jp/s?k=${encodeURIComponent(kw)}`,
  },
];

function timeLeft(endTimeStr: string): string {
  if (!endTimeStr) return "";
  const diff = new Date(endTimeStr).getTime() - Date.now();
  if (diff <= 0) return "終了";
  const d = Math.floor(diff / 86400000);
  if (d > 0) return `残り${d}日`;
  const h = Math.floor(diff / 3600000);
  if (h > 0) return `残り${h}時間`;
  return `残り${Math.floor(diff / 60000)}分`;
}

export default function ResearchPhase({ onJudge }: Props) {
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [targetMarginRate, setTargetMarginRate] = useState(20);
  const [manualPrice, setManualPrice] = useState("");

  // AI recommendation state
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [marketSummary, setMarketSummary] = useState("");
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState("");

  // Yahoo Auctions state
  const [items, setItems] = useState<YahooAuctionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [yahooLoading, setYahooLoading] = useState(false);
  const [yahooError, setYahooError] = useState("");
  const [activeSearchKeyword, setActiveSearchKeyword] = useState("");
  const [usedSearchQuery, setUsedSearchQuery] = useState("");
  const [mercariConditions, setMercariConditions] = useState<string[]>([]);
  const [yahooCondition, setYahooCondition] = useState("");

  // メルカリ画像キーワード精密化（Vision）
  const [refiningSet, setRefiningSet] = useState<Set<string>>(new Set());

  // AI推薦商品の推定売値（ヤフオク検索の仕入れ上限計算に使用）
  const [activeRecSellPrice, setActiveRecSellPrice] = useState(0);

  // まとめ商品除外フラグ
  const [excludeBundle, setExcludeBundle] = useState(false);

  // Mercari AI analysis state
  const [mercariAnalysisOpen, setMercariAnalysisOpen] = useState(false);
  const [mercariInputMode, setMercariInputMode] = useState<"paste" | "manual">("paste");
  const [mercariPasteText, setMercariPasteText] = useState("");
  const [mercariManualEntries, setMercariManualEntries] = useState(
    Array.from({ length: 8 }, () => ({ name: "", price: "" }))
  );
  const [mercariAnalysisLoading, setMercariAnalysisLoading] = useState(false);
  const [mercariAnalysisError, setMercariAnalysisError] = useState("");
  const [mercariAnalysisResult, setMercariAnalysisResult] = useState<MercariAnalysisResult | null>(null);
  const [mercariSuggestLoading, setMercariSuggestLoading] = useState(false);
  const [mercariSuggestError, setMercariSuggestError] = useState("");

  const sourcingRef = useRef<HTMLDivElement>(null);

  const baseKeyword = [brand, category, modelNumber].filter(Boolean).join(" ").trim();
  const canSearch = brand.trim() !== "";
  const hasPriceRange = priceMin > 0 && priceMax >= priceMin;
  const canAnalyze =
    mercariInputMode === "paste"
      ? mercariPasteText.trim().length > 0
      : mercariManualEntries.some((e) => e.name.trim().length > 0);
  const estimatedPrice = hasPriceRange ? Math.round((priceMin + priceMax) / 2) : 0;

  // 仕入れ上限額の計算: メルカリ価格 × 0.9（手数料10%控除）− 1,000円（送料）
  const maxPurchaseFromMin = hasPriceRange ? Math.floor(priceMin * 0.9 - 1000) : 0;
  const maxPurchaseFromMax = priceMax > 0 ? Math.floor(priceMax * 0.9 - 1000) : 0;

  const mercariUrl = (() => {
    const p = new URLSearchParams({ keyword: baseKeyword });
    if (priceMin > 0) p.set("price_min", String(priceMin));
    if (priceMax > 0) p.set("price_max", String(priceMax));
    p.set("status", "sold_out");
    // 新しい順（最近売れた順）で表示
    p.set("sort", "created_time");
    p.set("order", "desc");
    const condStr = mercariConditions
      .map((c) => `item_conditions[]=${c}`)
      .join("&");
    return `https://jp.mercari.com/search?${p}${condStr ? "&" + condStr : ""}`;
  })();

  const search: SearchConditions = { brand, category, priceMin, priceMax, modelNumber };

  // ── AI推薦 ──────────────────────────────
  const handleAiRecommend = async () => {
    setRecLoading(true);
    setRecError("");
    setRecommendations([]);
    setMarketSummary("");
    setItems([]);
    setActiveSearchKeyword("");
    setActiveRecSellPrice(0); // AI推薦リセット時に売値もクリア
    try {
      const r = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, category, modelNumber, priceMin, priceMax }),
      });
      const data = await r.json();
      if (data.error) {
        setRecError(data.error);
      } else {
        setRecommendations(data.recommendations ?? []);
        setMarketSummary(data.marketSummary ?? "");
      }
    } catch {
      setRecError("AI分析に失敗しました");
    } finally {
      setRecLoading(false);
    }
  };

  // ── ヤフオク検索 ─────────────────────────
  // recSellPrice: AI推薦商品の推定売値。渡されればその商品専用の仕入れ上限を計算する
  const searchYahoo = async (keyword: string, conditionOverride?: string, recSellPrice?: number) => {
    const cond = conditionOverride !== undefined ? conditionOverride : yahooCondition;

    // AI推薦のsellPriceが渡された → stateを更新して使用
    // 渡されなかった → 現在のstateを引き継ぐ（状態フィルター切り替え時など）
    const usedSellPrice = recSellPrice !== undefined ? recSellPrice : activeRecSellPrice;
    if (recSellPrice !== undefined) setActiveRecSellPrice(recSellPrice);

    // 実効的な仕入れ上限: AI推薦のsellPriceがあればそれを優先、なければStep3のグローバル値
    const effectiveMaxPurchase = usedSellPrice > 0
      ? Math.floor(usedSellPrice * 0.9 - 1000)
      : maxPurchaseFromMax;

    setActiveSearchKeyword(keyword);
    setUsedSearchQuery(keyword);
    setYahooLoading(true);
    setYahooError("");
    setItems([]);
    try {
      const params = new URLSearchParams({ query: keyword });
      if (cond) params.set("condition", cond);
      // 実効仕入れ上限でフィルター
      if (effectiveMaxPurchase > 0) params.set("maxPrice", String(effectiveMaxPurchase));
      const r = await fetch(`/api/yahoo-auctions?${params}`);
      const data = await r.json();
      if (data.error) setYahooError(data.error);
      else {
        // ① 価格フィルター（API側フィルタ済みだが念のため）
        let filtered: YahooAuctionItem[] = effectiveMaxPurchase > 0
          ? (data.items ?? []).filter((item: YahooAuctionItem) => item.currentPrice <= effectiveMaxPurchase)
          : (data.items ?? []);
        // ② まとめ商品フィルター
        if (excludeBundle) {
          const bundleWords = ["まとめ", "セット", "まとめ売り", "まとめて", "一括", "ロット", "大量", "福袋"];
          filtered = filtered.filter(
            (item) => !bundleWords.some((w) => item.title.includes(w))
          );
        }
        setItems(filtered);
        setTotal(filtered.length);
        if (data.usedQuery) setUsedSearchQuery(data.usedQuery);
      }
    } catch {
      setYahooError("通信エラーが発生しました");
    } finally {
      setYahooLoading(false);
    }
    setTimeout(
      () => sourcingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      100
    );
  };

  // ── メルカリ 画像解析 → 類似商品絞り込み検索 ──────────
  const handleMercariVisualSearch = async (
    e: React.MouseEvent,
    item: YahooAuctionItem
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (refiningSet.has(item.auctionId)) return;

    const fallbackKeyword = cleanTitleForMercari(item.title);
    const fallbackUrl = `https://jp.mercari.com/search?keyword=${encodeURIComponent(fallbackKeyword)}&status=sold_out&sort=created_time&order=desc`;

    // ① ポップアップブロッカー回避：await の前に必ずウィンドウを開く
    const newTab = window.open("about:blank", "_blank");

    // 画像なし → 即フォールバック
    if (!item.thumbnailUrl) {
      if (newTab) newTab.location.href = fallbackUrl;
      else window.open(fallbackUrl, "_blank");
      return;
    }

    setRefiningSet((prev) => new Set([...prev, item.auctionId]));
    try {
      const r = await fetch("/api/refine-keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: item.thumbnailUrl, title: item.title }),
      });
      const data = await r.json();
      const keyword: string = data.refinedKeyword || fallbackKeyword;
      const url = `https://jp.mercari.com/search?keyword=${encodeURIComponent(keyword)}&status=sold_out&sort=created_time&order=desc`;
      if (newTab) newTab.location.href = url;
      else window.open(url, "_blank");
    } catch {
      // API失敗 → テキストフォールバック
      if (newTab) newTab.location.href = fallbackUrl;
      else window.open(fallbackUrl, "_blank");
    } finally {
      setRefiningSet((prev) => {
        const next = new Set(prev);
        next.delete(item.auctionId);
        return next;
      });
    }
  };

  // ── メルカリ AI 売れ筋分析 ─────────────────
  const handleMercariAnalyze = async () => {
    let textToAnalyze = "";
    if (mercariInputMode === "paste") {
      if (!mercariPasteText.trim()) return;
      textToAnalyze = mercariPasteText;
    } else {
      const validEntries = mercariManualEntries.filter((e) => e.name.trim());
      if (validEntries.length === 0) return;
      textToAnalyze = validEntries
        .map(
          (e, i) =>
            `${i + 1}. ${e.name.trim()}${e.price.trim() ? ` ¥${e.price.trim()}` : ""}`
        )
        .join("\n");
    }
    setMercariAnalysisLoading(true);
    setMercariAnalysisError("");
    setMercariAnalysisResult(null);
    try {
      const r = await fetch("/api/mercari-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToAnalyze, keyword: baseKeyword }),
      });
      const data = await r.json();
      if (data.error) {
        setMercariAnalysisError(data.error);
      } else {
        setMercariAnalysisResult(data);
      }
    } catch {
      setMercariAnalysisError("通信エラーが発生しました");
    } finally {
      setMercariAnalysisLoading(false);
    }
  };

  // ── メルカリ AI 3件自動ピックアップ ──────────────
  const handleMercariSuggest = async () => {
    setMercariSuggestLoading(true);
    setMercariSuggestError("");
    try {
      const r = await fetch("/api/mercari-suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brand, category, modelNumber }),
      });
      const data = await r.json();
      if (data.error) {
        setMercariSuggestError(data.error);
      } else {
        const suggestions: Array<{ name: string; estimatedPrice: number }> =
          data.suggestions ?? [];
        const next = Array.from({ length: 8 }, (_, i) => ({
          name: suggestions[i]?.name ?? "",
          price: suggestions[i]?.estimatedPrice
            ? String(suggestions[i].estimatedPrice)
            : "",
        }));
        setMercariManualEntries(next);
      }
    } catch {
      setMercariSuggestError("通信エラーが発生しました");
    } finally {
      setMercariSuggestLoading(false);
    }
  };

  const handleJudge = (price: number, title: string, url: string) => {
    onJudge({ purchasePrice: price, itemTitle: title, itemUrl: url, search, targetMarginRate });
  };

  const showSourcingArea = activeSearchKeyword !== "" || recommendations.length > 0;

  return (
    <div className="space-y-4">
      {/* ── 検索フォーム ── */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-md shadow-stone-200/50 space-y-4">

        {/* Step 1 */}
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 bg-amber-700 text-white rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">1</span>
          <h2 className="text-sm font-bold text-stone-800">ブランド・カテゴリを入力する</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              ブランド名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="例：コーチ、グッチ"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">カテゴリ</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="例：バッグ、財布"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              型番・品番
              <span className="text-slate-400 font-normal ml-1">（任意）</span>
            </label>
            <input
              type="text"
              value={modelNumber}
              onChange={(e) => setModelNumber(e.target.value)}
              placeholder="例：F12345"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            />
          </div>
        </div>

        {/* まとめ商品の除外設定 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExcludeBundle((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              excludeBundle
                ? "bg-orange-500 text-white border-orange-500"
                : "bg-white text-slate-500 border-slate-300 hover:border-orange-300 hover:text-orange-600"
            }`}
          >
            <span>{excludeBundle ? "✓" : "○"}</span>
            まとめ商品を除外する
          </button>
          <span className="text-xs text-slate-400">
            {excludeBundle
              ? "「まとめ・セット・ロット」等の出品を除外中"
              : "ヤフオクのまとめ出品も検索対象に含む"}
          </span>
        </div>

        {canSearch && (
          <>
            <hr className="border-slate-100" />

            {/* Step 2 */}
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-stone-800 text-white rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">2</span>
              <h2 className="text-sm font-bold text-stone-800">メルカリで相場を確認する</h2>
            </div>
            {/* 商品状態フィルター（メルカリ） */}
            <div>
              <p className="text-xs text-slate-500 mb-1.5">
                商品状態で絞り込む
                <span className="ml-1 text-slate-400 font-normal">（複数選択可・未選択時は全状態）</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {MERCARI_CONDITIONS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() =>
                      setMercariConditions((prev) =>
                        prev.includes(c.value)
                          ? prev.filter((v) => v !== c.value)
                          : [...prev, c.value]
                      )
                    }
                    className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                      mercariConditions.includes(c.value)
                        ? "bg-red-500 text-white border-red-500"
                        : "bg-white text-slate-500 border-slate-300 hover:border-red-300"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <a
              href={mercariUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-rose-800 hover:bg-rose-900 text-white rounded-xl font-semibold text-sm transition-colors tracking-wide"
            >
              メルカリで「{baseKeyword}」の取引実績を確認 →
            </a>
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800 space-y-1.5">
              <p className="font-semibold">📋 メルカリ取引実績の確認方法</p>
              <p>開いたページは <strong>「売り切れ」を新しい順</strong> で表示しています。</p>
              <ol className="list-decimal list-inside space-y-1 text-amber-700">
                <li>上位に表示される商品ほど <strong>最近売れた</strong> 実績があります</li>
                <li>同じような商品が <strong>10件以上</strong> 並んでいれば需要が高い目安です</li>
                <li>価格帯を確認し、下の「③ メルカリで確認した価格帯を入力」に記録してください</li>
              </ol>
              <p className="text-amber-600 text-xs">
                ※ メルカリは日付範囲での絞り込みURLに対応していないため、
                目視で直近の取引（表示日付が古くなるまで）をご確認ください
              </p>
              <div className="mt-2 pt-2 border-t border-amber-300">
                <p className="font-semibold mb-1">📱 スマホで販売中の商品も表示される場合</p>
                <p className="text-amber-700 mb-1">
                  メルカリアプリで開くとフィルターがリセットされることがあります。
                  下記の手順で「売り切れ」に絞り込んでください。
                </p>
                <ol className="list-decimal list-inside space-y-1 text-amber-700">
                  <li>メルカリの検索結果画面で <strong>「絞り込み」</strong> をタップ</li>
                  <li><strong>「販売状況」</strong> を選択</li>
                  <li><strong>「売り切れ」</strong> にチェックを入れる</li>
                  <li><strong>「完了」</strong> または <strong>「適用」</strong> をタップ</li>
                </ol>
              </div>
            </div>

            {/* ── メルカリ AI 売れ筋分析パネル ── */}
            <div className="border border-indigo-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setMercariAnalysisOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-sm font-semibold text-indigo-800 transition-colors"
              >
                <span>🤖 AIでメルカリの売れ筋を自動分析する</span>
                <span className="text-indigo-400 text-xs">{mercariAnalysisOpen ? "▲ 閉じる" : "▼ 開く"}</span>
              </button>

              {mercariAnalysisOpen && (
                <div className="p-4 space-y-3 bg-white">
                  {/* モード切り替えタブ */}
                  <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setMercariInputMode("paste")}
                      className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
                        mercariInputMode === "paste"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      💻 コピペ（PC向け）
                    </button>
                    <button
                      type="button"
                      onClick={() => setMercariInputMode("manual")}
                      className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
                        mercariInputMode === "manual"
                          ? "bg-white text-indigo-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      📱 手入力（スマホ向け）
                    </button>
                  </div>

                  {mercariInputMode === "paste" ? (
                    <>
                      <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5 text-xs text-indigo-800 space-y-1.5">
                        <p className="font-semibold">📋 使い方（PC）</p>
                        <ol className="list-decimal list-inside space-y-1 text-indigo-700">
                          <li>上の「メルカリで取引実績を確認」ボタンでメルカリを開く</li>
                          <li>メルカリのページで <strong>Ctrl+A</strong>（全選択）→ <strong>Ctrl+C</strong>（コピー）</li>
                          <li>下のテキストエリアに <strong>Ctrl+V</strong> で貼り付ける</li>
                          <li>「AIで売れ筋を分析」ボタンを押す</li>
                        </ol>
                      </div>
                      <textarea
                        value={mercariPasteText}
                        onChange={(e) => setMercariPasteText(e.target.value)}
                        placeholder="メルカリの売り切れページをCtrl+A → Ctrl+Cでコピーして、ここにCtrl+Vで貼り付けてください..."
                        rows={6}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white resize-y"
                      />
                    </>
                  ) : (
                    <>
                      <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2.5 text-xs text-indigo-800 space-y-1.5">
                        <p className="font-semibold">📋 使い方（スマホ）</p>
                        <ol className="list-decimal list-inside space-y-1 text-indigo-700">
                          <li>上の「メルカリで取引実績を確認」ボタンでメルカリを開く</li>
                          <li>売れていた商品の名前と価格を確認する</li>
                          <li>このアプリに戻り、下のフォームに入力する</li>
                          <li>「AIで売れ筋を分析」ボタンを押す</li>
                        </ol>
                        <p className="text-indigo-600">※ 価格は任意です。商品名だけでも分析できます</p>
                      </div>
                      {/* AIが8件自動ピックアップ */}
                      <button
                        type="button"
                        onClick={handleMercariSuggest}
                        disabled={mercariSuggestLoading}
                        className="w-full py-2.5 bg-amber-700 hover:bg-amber-800 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        {mercariSuggestLoading ? (
                          <>
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            AIが考え中...
                          </>
                        ) : (
                          "✨ AIが売れ筋3件を自動入力する"
                        )}
                      </button>
                      {mercariSuggestError && (
                        <p className="text-xs text-red-600">⚠️ {mercariSuggestError}</p>
                      )}
                      <p className="text-xs text-slate-400 text-center -mt-1">
                        入力された内容は自由に修正できます
                      </p>

                      <div className="space-y-2">
                        {mercariManualEntries.map((entry, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-4 flex-shrink-0 text-right">{i + 1}.</span>
                            <input
                              type="text"
                              value={entry.name}
                              onChange={(e) => {
                                const next = [...mercariManualEntries];
                                next[i] = { ...next[i], name: e.target.value };
                                setMercariManualEntries(next);
                              }}
                              placeholder="商品名（例：コーチ トートバッグ）"
                              className="flex-1 px-2.5 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                            />
                            <div className="relative w-24 flex-shrink-0">
                              <input
                                type="number"
                                value={entry.price}
                                onChange={(e) => {
                                  const next = [...mercariManualEntries];
                                  next[i] = { ...next[i], price: e.target.value };
                                  setMercariManualEntries(next);
                                }}
                                placeholder="価格"
                                min={0}
                                className="w-full pl-2 pr-6 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                              />
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">円</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <button
                    onClick={handleMercariAnalyze}
                    disabled={!canAnalyze || mercariAnalysisLoading}
                    className="w-full py-2.5 bg-stone-800 hover:bg-stone-900 disabled:bg-stone-200 disabled:text-stone-400 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {mercariAnalysisLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        AI分析中...
                      </>
                    ) : (
                      "🤖 AIで売れ筋を分析する"
                    )}
                  </button>

                  {mercariAnalysisError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                      ⚠️ {mercariAnalysisError}
                    </div>
                  )}

                  {mercariAnalysisResult && (
                    <div className="space-y-3">
                      {/* サマリー */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                        <p className="text-xs font-bold text-emerald-800 mb-1">📊 市場分析</p>
                        <p className="text-xs text-emerald-700">{mercariAnalysisResult.summary}</p>
                        {mercariAnalysisResult.bestBuyTarget && (
                          <p className="text-xs font-semibold text-emerald-900 mt-2 bg-emerald-100 rounded-lg px-2 py-1.5">
                            ✅ 最優先ターゲット：{mercariAnalysisResult.bestBuyTarget}
                          </p>
                        )}
                      </div>

                      {/* 売れ筋リスト */}
                      <p className="text-xs font-bold text-slate-700">
                        売れ筋商品 TOP {mercariAnalysisResult.topProducts?.length ?? 0}件
                      </p>

                      {mercariAnalysisResult.topProducts?.map((product, i) => (
                        <div key={i} className="border border-slate-200 rounded-xl p-3 space-y-2 bg-white hover:shadow-sm transition-shadow">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="inline-block text-xs bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded mr-1.5 flex-shrink-0">
                                #{i + 1}
                              </span>
                              <span className="text-sm font-bold text-slate-800">{product.name}</span>
                            </div>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                              product.salesFrequency === "多い"
                                ? "bg-emerald-100 text-emerald-700"
                                : product.salesFrequency === "普通"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-slate-100 text-slate-500"
                            }`}>
                              {product.salesFrequency}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-base font-bold text-rose-600">{product.priceRange}</span>
                            {product.recentCount > 0 && (
                              <span className="text-xs text-slate-400">{product.recentCount}件確認</span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">{product.reason}</p>

                          <button
                            onClick={() => searchYahoo(product.searchKeyword)}
                            className="w-full py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                          >
                            🔍 「{product.searchKeyword}」でヤフオクを検索
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <hr className="border-slate-100" />

            {/* Step 3 */}
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-amber-700 text-white rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">3</span>
              <h2 className="text-sm font-bold text-stone-800">メルカリで確認した価格帯を入力</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={priceMin || ""}
                  onChange={(e) => setPriceMin(Number(e.target.value))}
                  placeholder="最小"
                  min={0}
                  className="w-full pl-3 pr-7 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">円</span>
              </div>
              <span className="text-slate-400 font-medium">〜</span>
              <div className="relative flex-1">
                <input
                  type="number"
                  value={priceMax || ""}
                  onChange={(e) => setPriceMax(Number(e.target.value))}
                  placeholder="最大"
                  min={0}
                  className="w-full pl-3 pr-7 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">円</span>
              </div>
            </div>
            {hasPriceRange && (
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-slate-600 space-y-0.5">
                {maxPurchaseFromMax > 0 ? (
                  <>
                    <p>ヤフオク検索は仕入れ上限 <strong className="text-blue-700">¥{maxPurchaseFromMax.toLocaleString()} 以下</strong> に絞り込みます</p>
                    <p className="text-slate-400">（メルカリ最高値 ¥{priceMax.toLocaleString()} × 0.9 − 送料1,000円）</p>
                  </>
                ) : (
                  <p className="text-amber-600">⚠️ メルカリ価格が低すぎて仕入れ上限がマイナスになります。価格帯を見直してください。</p>
                )}
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">目標利益率</label>
              <div className="relative w-32">
                <input
                  type="number"
                  value={targetMarginRate}
                  onChange={(e) => setTargetMarginRate(Number(e.target.value))}
                  min={0}
                  max={100}
                  className="w-full pl-3 pr-7 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Step 4 */}
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 bg-stone-900 text-white rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0">4</span>
              <h2 className="text-sm font-bold text-stone-800">AIが仕入れる商品を断定する</h2>
            </div>

            {/* 仕入れ上限額の表示 */}
            {hasPriceRange && maxPurchaseFromMax > 0 ? (
              <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-2.5 text-xs text-purple-800 space-y-1.5">
                <p className="font-semibold">💰 AI選定の仕入れ上限額</p>
                <p className="text-purple-700">
                  メルカリ手数料(10%) ＋ 送料(1,000円) を差し引いた金額で選定します
                </p>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="bg-white rounded-lg px-2 py-1.5 text-center border border-purple-100">
                    <p className="text-xs text-purple-500">最低価格ベース</p>
                    <p className="text-base font-bold text-purple-800">
                      ¥{maxPurchaseFromMin.toLocaleString()}
                    </p>
                    <p className="text-xs text-purple-400">
                      ¥{priceMin.toLocaleString()} × 0.9 − 1,000
                    </p>
                  </div>
                  <div className="bg-white rounded-lg px-2 py-1.5 text-center border border-purple-100">
                    <p className="text-xs text-purple-500">最高価格ベース</p>
                    <p className="text-base font-bold text-purple-800">
                      ¥{maxPurchaseFromMax.toLocaleString()}
                    </p>
                    <p className="text-xs text-purple-400">
                      ¥{priceMax.toLocaleString()} × 0.9 − 1,000
                    </p>
                  </div>
                </div>
                <p className="text-xs text-purple-600 font-medium">
                  → AIは仕入れ価格 ¥{maxPurchaseFromMax.toLocaleString()} 以下の商品のみ提案します
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
                ⚠️ STEP 3でメルカリ価格帯を入力すると、仕入れ上限額を自動計算してAIに反映します
              </div>
            )}

            <button
              onClick={handleAiRecommend}
              disabled={recLoading}
              className="w-full py-3 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 tracking-wide"
            >
              {recLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  AI分析中...
                </>
              ) : (
                `✨ AIが「${baseKeyword}」の仕入れ商品を断定する`
              )}
            </button>
            <p className="text-xs text-slate-400 text-center -mt-2">
              ※ 品番・モデル名を含め、仕入れ上限額内の商品のみ提案します
            </p>
          </>
        )}
      </div>

      {/* ── 画像で仕入れ先検索 ── */}
      {canSearch && <ImageSearchPanel />}

      {/* ── AI推薦エラー ── */}
      {recError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 space-y-1">
          <p className="font-semibold">⚠️ {recError}</p>
          {recError.includes(".env.local") && (
            <p className="text-red-500">
              プロジェクトフォルダの <code className="bg-red-100 px-1 rounded">.env.local</code> ファイルを開いてAPIキーを入力し、サーバーを再起動してください。
            </p>
          )}
        </div>
      )}

      {/* ── AI推薦結果 ── */}
      {recommendations.length > 0 && (
        <ProductRecommendations
          recommendations={recommendations}
          marketSummary={marketSummary}
          activeKeyword={activeSearchKeyword}
          onSelect={(rec) => searchYahoo(rec.searchKeyword, undefined, rec.estimatedSellPrice)}
        />
      )}

      {/* ── 仕入れ先検索エリア ── */}
      {showSourcingArea && (
        <div ref={sourcingRef} className="space-y-4">
          {/* 外部リンク */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-600 mb-3">
              他の仕入れ先サイトでも検索
              {activeSearchKeyword && (
                <span className="ml-1 text-slate-400 font-normal">「{activeSearchKeyword}」</span>
              )}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://auctions.yahoo.co.jp/search/search?p=${encodeURIComponent(activeSearchKeyword || baseKeyword)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold hover:opacity-80 transition-opacity"
              >
                ヤフオク（一覧）
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              {PLATFORMS.map((p) => (
                <a
                  key={p.name}
                  href={p.url(activeSearchKeyword || baseKeyword)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-semibold hover:opacity-80 transition-opacity ${p.color}`}
                >
                  {p.name}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* ヤフオク リアルタイム */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <div className="mb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    ヤフオク リアルタイム出品
                    {total > 0 && (
                      <span className="ml-1 text-slate-400 font-normal">（全{total.toLocaleString()}件）</span>
                    )}
                  </p>
                  {activeSearchKeyword && (
                    <p className="text-xs text-slate-400">
                      検索：「{usedSearchQuery || activeSearchKeyword}」
                      {usedSearchQuery && usedSearchQuery !== activeSearchKeyword && (
                        <span className="ml-1.5 text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          品番を除いて再検索しました
                        </span>
                      )}
                    </p>
                  )}
                </div>
                {/* 商品状態フィルター（ヤフオク） */}
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">状態：</span>
                  {YAHOO_CONDITIONS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => {
                        setYahooCondition(c.value);
                        if (activeSearchKeyword) searchYahoo(activeSearchKeyword, c.value);
                      }}
                      className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                        yahooCondition === c.value
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-500 border-slate-300 hover:border-emerald-400"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {yahooLoading && (
              <div className="text-center py-8 text-slate-400">
                <div className="inline-block w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin mb-2" />
                <p className="text-xs">ヤフオクを検索中...</p>
              </div>
            )}

            {yahooError && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700 space-y-1">
                <p className="font-semibold">⚠️ {yahooError}</p>
                {yahooError.includes(".env.local") && (
                  <p className="text-red-500">
                    <code className="bg-red-100 px-1 rounded">.env.local</code> に YAHOO_APP_ID を入力し、サーバーを再起動してください。
                  </p>
                )}
              </div>
            )}

            {!yahooLoading && !yahooError && items.length === 0 && activeSearchKeyword && (
              <div className="text-center py-6 text-slate-400 text-xs">
                「{activeSearchKeyword}」の出品が見つかりませんでした
              </div>
            )}

            {!yahooLoading && items.length > 0 && (
              <div className="space-y-3">
                {!hasPriceRange && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                    ⚠️ STEP 3のメルカリ観測価格を入力すると、ここから直接利益判定できます
                  </div>
                )}
                {items.map((item) => (
                  <div key={item.auctionId} className="border border-slate-200 rounded-xl overflow-hidden">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 p-3 hover:bg-slate-50 transition-colors"
                    >
                      {item.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-slate-100"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-100 rounded-lg flex-shrink-0 flex items-center justify-center text-slate-300 text-xs text-center">
                          画像なし
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700 font-medium line-clamp-2 mb-1.5">
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base font-bold text-slate-800">
                            ¥{item.currentPrice.toLocaleString()}
                          </span>
                          {item.condition && (
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              item.condition === "new"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-amber-100 text-amber-700"
                            }`}>
                              {item.condition === "new" ? "新品" : "中古"}
                            </span>
                          )}
                          {item.bids > 0 && (
                            <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">
                              {item.bids}入札
                            </span>
                          )}
                          {item.endTime && (
                            <span className="text-xs text-slate-400">{timeLeft(item.endTime)}</span>
                          )}
                        </div>
                        {/* 利益見込み表示 */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {item.currentPrice > 0 && (() => {
                            // AI推薦のsellPriceがあればそれを優先、なければStep3のグローバル値
                            const refSellPrice = activeRecSellPrice > 0 ? activeRecSellPrice : estimatedPrice;
                            if (refSellPrice <= 0) return null;
                            const maxBuy = Math.floor(refSellPrice * 0.9 - 1000);
                            const profit = maxBuy - item.currentPrice;
                            return (
                              <span className="text-xs text-slate-500 flex items-center gap-1 flex-wrap">
                                {activeRecSellPrice > 0 ? (
                                  <>
                                    <span>メルカリ推定売値</span>
                                    <span className="font-semibold text-slate-700">¥{activeRecSellPrice.toLocaleString()}</span>
                                    <span>→ 利益見込み</span>
                                    <span className={`font-bold px-1.5 py-0.5 rounded text-xs ${
                                      profit >= 1000
                                        ? "bg-emerald-100 text-emerald-700"
                                        : profit >= 0
                                        ? "bg-yellow-100 text-yellow-700"
                                        : "bg-red-100 text-red-600"
                                    }`}>
                                      {profit >= 0 ? "+" : ""}¥{profit.toLocaleString()}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span>仕入れ上限</span>
                                    <span className="font-semibold text-rose-600">¥{maxBuy.toLocaleString()}</span>
                                    <span className={`font-bold px-1.5 py-0.5 rounded text-xs ${
                                      profit >= 0
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-red-100 text-red-600"
                                    }`}>
                                      {profit >= 0 ? "余裕 +" : "超過 "}¥{Math.abs(profit).toLocaleString()}
                                    </span>
                                  </>
                                )}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {/* メルカリ売値確認（写真AI解析で視覚的類似品に絞る） */}
                          <button
                            type="button"
                            onClick={(e) => handleMercariVisualSearch(e, item)}
                            disabled={refiningSet.has(item.auctionId)}
                            className="flex items-center gap-0.5 text-xs text-red-500 hover:text-red-700 hover:underline disabled:text-slate-400 disabled:cursor-wait"
                          >
                            {refiningSet.has(item.auctionId) ? (
                              <>
                                <span className="w-3 h-3 border border-slate-300 border-t-red-400 rounded-full animate-spin inline-block" />
                                <span className="ml-0.5">写真解析中...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                メルカリで売値確認
                              </>
                            )}
                          </button>
                          {/* Google テキスト検索（Yahoo画像はホットリンク禁止のためLens uploadbyurlは使用不可） */}
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(cleanTitleForMercari(item.title))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700 hover:underline"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            Googleで商品検索
                          </a>
                        </div>
                      </div>
                    </a>
                    <div className="px-3 pb-3">
                      <button
                        onClick={() => handleJudge(item.currentPrice, item.title, item.url)}
                        disabled={!hasPriceRange}
                        className={`w-full py-2.5 text-xs font-bold rounded-lg transition-colors ${
                          hasPriceRange
                            ? "bg-amber-700 hover:bg-amber-800 text-white"
                            : "bg-stone-100 text-stone-400 cursor-not-allowed"
                        }`}
                      >
                        {hasPriceRange
                          ? `💹 ¥${item.currentPrice.toLocaleString()} で利益判定する`
                          : "↑ STEP 3でメルカリ観測価格を入力してください"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 手動価格入力 */}
            {activeSearchKeyword && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold text-slate-500 mb-2">金額を直接入力して判定</p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      value={manualPrice}
                      onChange={(e) => setManualPrice(e.target.value)}
                      placeholder="仕入れ予定価格"
                      min={0}
                      className="w-full pl-3 pr-7 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">円</span>
                  </div>
                  <button
                    onClick={() => {
                      if (!manualPrice || !hasPriceRange) return;
                      handleJudge(Number(manualPrice), activeSearchKeyword, "");
                    }}
                    disabled={!manualPrice || !hasPriceRange}
                    className="px-4 py-2 bg-stone-900 text-white text-xs font-bold rounded-lg hover:bg-stone-700 disabled:bg-stone-200 disabled:text-stone-400 disabled:cursor-not-allowed transition-colors"
                  >
                    判定
                  </button>
                </div>
                {!hasPriceRange && (
                  <p className="text-xs text-slate-400 mt-1">※ STEP 3の価格帯を入力してください</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI未使用時：直接ヤフオク検索 */}
      {canSearch && recommendations.length === 0 && !activeSearchKeyword && !recLoading && (
        <button
          onClick={() => searchYahoo(baseKeyword)}
          className="w-full py-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl font-bold text-sm transition-colors tracking-wide"
        >
          🔍 「{baseKeyword}」をヤフオクで今すぐ探す
        </button>
      )}

      {/* ── リセットボタン ── */}
      <button
        type="button"
        onClick={() => {
          setBrand("");
          setCategory("");
          setModelNumber("");
          setPriceMin(0);
          setPriceMax(0);
          setTargetMarginRate(20);
          setManualPrice("");
          setExcludeBundle(false);
          setRecommendations([]);
          setMarketSummary("");
          setRecError("");
          setItems([]);
          setTotal(0);
          setYahooError("");
          setActiveSearchKeyword("");
          setUsedSearchQuery("");
          setMercariConditions([]);
          setYahooCondition("");
          setActiveRecSellPrice(0);
          setMercariAnalysisOpen(false);
          setMercariInputMode("paste");
          setMercariPasteText("");
          setMercariManualEntries(Array.from({ length: 8 }, () => ({ name: "", price: "" })));
          setMercariAnalysisResult(null);
          setMercariAnalysisError("");
        }}
        className="w-full py-3 border-2 border-slate-200 text-slate-400 rounded-xl font-semibold text-sm hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        🔄 入力内容をすべてリセット
      </button>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import ResearchPhase from "./components/ResearchPhase";
import JudgementPhase, { JudgeParams } from "./components/JudgementPhase";
import HistoryList from "./components/HistoryList";
import BetaGate from "./components/BetaGate";
import { HistoryItem } from "./types";

const HISTORY_KEY = "shiire_hantei_history";

export interface RestoreValues {
  brand: string;
  category: string;
  modelNumber: string;
  priceMin: number;
  priceMax: number;
  targetMarginRate: number;
}

export default function Home() {
  const [phase, setPhase] = useState<"research" | "judgement">("research");
  const [judgeParams, setJudgeParams] = useState<JudgeParams | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [restoreValues, setRestoreValues] = useState<RestoreValues | null>(null);
  const [restoreCount, setRestoreCount] = useState(0);

  useEffect(() => {
    try {
      const h = localStorage.getItem(HISTORY_KEY);
      if (h) setHistory(JSON.parse(h));
    } catch {
      // ignore
    }
  }, []);

  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  };

  const handleJudge = (params: JudgeParams) => {
    setJudgeParams(params);
    setPhase("judgement");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setPhase("research");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRestore = (item: HistoryItem) => {
    setRestoreValues({
      brand: item.brand,
      category: item.category ?? "",
      modelNumber: item.modelNumber ?? "",
      priceMin: item.priceMin ?? 0,
      priceMax: item.priceMax ?? 0,
      targetMarginRate: item.targetMarginRate ?? 20,
    });
    setRestoreCount((c) => c + 1);
    setPhase("research");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <BetaGate>
    <div className="min-h-screen bg-black">
      {/* ── ヘッダー：ダーク×ゴールドアクセント ── */}
      <header className="bg-stone-900 border-b-2 border-amber-600 shadow-lg sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 relative">
          {/* 戻るボタン（左端に絶対配置） */}
          {phase === "judgement" && (
            <button
              onClick={handleBack}
              className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1 text-amber-400 hover:text-amber-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-semibold">戻る</span>
            </button>
          )}
          {/* タイトル：中央揃え */}
          <div className="text-center">
            <h1 className="text-xl font-bold text-white tracking-widest font-mincho">
              仕入れ判定サポート
            </h1>
            <p className="text-sm text-amber-400/80 tracking-widest mt-0.5">
              {phase === "research"
                ? "AI断定 → 仕入れ先検索 → 利益判定"
                : "← 戻るで検索画面に戻れます"}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5">
        {/* ResearchPhaseは常にマウントしたままにして入力状態を保持する */}
        <div className={phase === "research" ? "" : "hidden"}>
          <ResearchPhase
            onJudge={handleJudge}
            restoreValues={restoreValues}
            restoreCount={restoreCount}
          />
        </div>

        {judgeParams && (
          <div className={phase === "judgement" ? "" : "hidden"}>
            <JudgementPhase
              {...judgeParams}
              onBack={handleBack}
              onSaveHistory={(item) => saveHistory([item, ...history].slice(0, 10))}
            />
          </div>
        )}

        <HistoryList
          history={history}
          onClear={() => saveHistory([])}
          onRestore={handleRestore}
        />
      </main>

      <footer className="mt-8 pb-8 text-center text-xs text-stone-400 border-t border-stone-200 pt-6">
        <p className="font-mincho tracking-widest text-stone-500">仕入れ判定サポート</p>
        <p className="mt-1">利益計算はメルカリ手数料10%・入力値をもとにした目安です</p>
      </footer>
    </div>
    </BetaGate>
  );
}

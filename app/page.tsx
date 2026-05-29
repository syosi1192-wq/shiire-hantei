"use client";

import { useState, useEffect } from "react";
import ResearchPhase from "./components/ResearchPhase";
import JudgementPhase, { JudgeParams } from "./components/JudgementPhase";
import HistoryList from "./components/HistoryList";
import { HistoryItem } from "./types";

const HISTORY_KEY = "shiire_hantei_history";

export default function Home() {
  const [phase, setPhase] = useState<"research" | "judgement">("research");
  const [judgeParams, setJudgeParams] = useState<JudgeParams | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          {phase === "judgement" && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors flex-shrink-0 py-1 pr-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-semibold">戻る</span>
            </button>
          )}
          <div>
            <h1 className="text-base font-bold text-slate-800 tracking-tight">
              仕入れ判定サポートツール
            </h1>
            <p className="text-xs text-slate-400">
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
          <ResearchPhase onJudge={handleJudge} />
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

        <HistoryList history={history} onClear={() => saveHistory([])} />
      </main>

      <footer className="mt-8 pb-8 text-center text-xs text-slate-400">
        <p>利益計算はメルカリ手数料10%・入力値をもとにした目安です</p>
      </footer>
    </div>
  );
}

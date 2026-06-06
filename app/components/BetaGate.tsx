"use client";

import { useState, useEffect } from "react";

// アクセスコードは .env.local の NEXT_PUBLIC_BETA_CODE で設定
// 未設定の場合は "BETA2025" が使われる
const BETA_CODE = process.env.NEXT_PUBLIC_BETA_CODE ?? "BETA2025";
const STORAGE_KEY = "beta_access_v1";
const FIRST_ACCESS_KEY = "beta_first_access_v1";
const BETA_DAYS = 30; // β版利用期間（日数）

type GateState = "loading" | "expired" | "granted" | "locked";

function checkAccess(): GateState {
  if (localStorage.getItem(STORAGE_KEY) !== "granted") return "locked";
  const firstAccess = localStorage.getItem(FIRST_ACCESS_KEY);
  if (!firstAccess) return "locked";
  const daysPassed =
    (Date.now() - new Date(firstAccess).getTime()) / (1000 * 60 * 60 * 24);
  if (daysPassed > BETA_DAYS) return "expired";
  return "granted";
}

function daysRemaining(): number {
  const firstAccess = localStorage.getItem(FIRST_ACCESS_KEY);
  if (!firstAccess) return 0;
  const passed =
    (Date.now() - new Date(firstAccess).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, Math.ceil(BETA_DAYS - passed));
}

interface Props {
  children: React.ReactNode;
}

export default function BetaGate({ children }: Props) {
  const [state, setState] = useState<GateState>("loading");
  const [remaining, setRemaining] = useState(0);
  const [inputCode, setInputCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const s = checkAccess();
    setState(s);
    if (s === "granted") setRemaining(daysRemaining());
  }, []);

  const handleSubmit = () => {
    if (inputCode.trim().toUpperCase() === BETA_CODE.toUpperCase()) {
      // 初回アクセス日時を記録
      if (!localStorage.getItem(FIRST_ACCESS_KEY)) {
        localStorage.setItem(FIRST_ACCESS_KEY, new Date().toISOString());
      }
      localStorage.setItem(STORAGE_KEY, "granted");
      setRemaining(daysRemaining());
      setState("granted");
    } else {
      setError("アクセスコードが違います。もう一度お試しください。");
      setInputCode("");
    }
  };

  // hydration中
  if (state === "loading") return null;

  // アクセス済み → アプリを表示（残り日数をヘッダー下に小さく表示）
  if (state === "granted") {
    return (
      <>
        {remaining <= 7 && (
          <div className="bg-amber-900/80 text-amber-200 text-xs text-center py-1.5 tracking-wide">
            ⚠️ β版利用期限まで残り <strong>{remaining}日</strong> です
          </div>
        )}
        {children}
      </>
    );
  }

  // 期限切れ画面
  if (state === "expired") {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-2xl font-bold text-white font-mincho tracking-widest">
            仕入れ判定サポート
          </h1>
          <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 space-y-3">
            <p className="text-3xl">🔒</p>
            <p className="text-white font-bold text-base">β版利用期間が終了しました</p>
            <p className="text-stone-400 text-xs leading-relaxed">
              30日間のβ版モニター期間が終了しました。<br />
              引き続きご利用の場合は、正式版のリリースをお待ちください。
            </p>
            <p className="text-amber-400/70 text-xs">
              ご参加いただきありがとうございました。
            </p>
          </div>
        </div>
      </div>
    );
  }

  // アクセスコード入力画面
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* タイトル */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white font-mincho tracking-widest mb-1">
            仕入れ判定サポート
          </h1>
          <p className="text-amber-400/80 text-sm tracking-widest">β版 モニター限定</p>
          <div className="flex justify-center gap-1 mt-3">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          </div>
        </div>

        {/* アクセスコード入力 */}
        <div className="bg-stone-900 border border-stone-700 rounded-2xl p-6 space-y-4">
          <p className="text-stone-300 text-sm text-center leading-relaxed">
            アクセスコードを入力してください
          </p>
          <input
            type="text"
            value={inputCode}
            onChange={(e) => { setInputCode(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            placeholder="ACCESS CODE"
            className="w-full px-4 py-3 bg-black border border-stone-600 rounded-xl text-white text-center text-lg tracking-widest focus:outline-none focus:border-amber-500 placeholder:text-stone-700 placeholder:text-sm placeholder:tracking-normal"
            autoFocus
          />
          {error && (
            <p className="text-red-400 text-xs text-center">{error}</p>
          )}
          <button
            onClick={handleSubmit}
            disabled={!inputCode.trim()}
            className="w-full py-3 bg-amber-700 hover:bg-amber-600 disabled:bg-stone-700 disabled:text-stone-500 text-white rounded-xl font-bold tracking-widest transition-colors"
          >
            入 力
          </button>
          <p className="text-stone-600 text-xs text-center leading-relaxed">
            アクセスコードはモニター募集時に<br />お知らせします
          </p>
        </div>
      </div>
    </div>
  );
}

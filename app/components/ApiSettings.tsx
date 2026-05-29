"use client";

import { useState } from "react";

interface Props {
  yahooAppId: string;
  anthropicApiKey: string;
  onSave: (yahooAppId: string, anthropicApiKey: string) => void;
  onClose: () => void;
}

export default function ApiSettings({ yahooAppId, anthropicApiKey, onSave, onClose }: Props) {
  const [yahooId, setYahooId] = useState(yahooAppId);
  const [anthropicKey, setAnthropicKey] = useState(anthropicApiKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-slate-800">⚙️ API設定</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">
              ✕
            </button>
          </div>

          {/* Anthropic API Key */}
          <div className="mb-5 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                AI分析
              </span>
              <label className="text-sm font-semibold text-slate-700">
                Anthropic APIキー
              </label>
            </div>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white font-mono text-sm mb-2"
            />
            <p className="text-xs text-slate-400 mb-3">
              「仕入れ商品をAIが断定」機能に使用します。
            </p>
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-purple-700">取得方法</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  <a
                    href="https://console.anthropic.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-purple-600 underline"
                  >
                    console.anthropic.com
                  </a>{" "}
                  にアクセス
                </li>
                <li>アカウント作成（無料）→ ログイン</li>
                <li>「API Keys」→「Create Key」で発行</li>
                <li>「sk-ant-...」で始まるキーをここに貼り付け</li>
              </ol>
              <p className="text-slate-400 mt-1">※ 利用量に応じた従量課金（1回数円程度）</p>
            </div>
          </div>

          {/* Yahoo App ID */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                ヤフオク
              </span>
              <label className="text-sm font-semibold text-slate-700">
                Yahoo! Japan アプリケーションID
              </label>
            </div>
            <input
              type="text"
              value={yahooId}
              onChange={(e) => setYahooId(e.target.value)}
              placeholder="dj00aiZp..."
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 bg-white font-mono text-sm mb-2"
            />
            <p className="text-xs text-slate-400 mb-3">
              ヤフオクのリアルタイム出品をアプリ内に表示するために使用します（無料）。
            </p>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-red-700">取得方法（無料・約5分）</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  <a
                    href="https://e.developer.yahoo.co.jp/register"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 underline"
                  >
                    Yahoo! JAPAN デベロッパーネットワーク
                  </a>{" "}
                  にアクセス
                </li>
                <li>Yahoo! JAPAN IDでログイン</li>
                <li>「新しいアプリケーションを開発」→「サーバーサイド」を選択</li>
                <li>発行された「アプリケーションID」を貼り付け</li>
              </ol>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 text-slate-600 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              onClick={() => {
                onSave(yahooId.trim(), anthropicKey.trim());
                onClose();
              }}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

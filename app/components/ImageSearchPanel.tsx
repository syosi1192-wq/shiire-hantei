"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type InputTab = "paste" | "url" | "tips";

/** PNG 変換（JPEG / WebP → PNG） */
async function convertToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("変換失敗"))),
        "image/png"
      );
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function ImageSearchPanel() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<InputTab>("paste");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl]   = useState<string | null>(null);
  const [blobUrl, setBlobUrl]       = useState<string | null>(null);
  const [imageBlob, setImageBlob]   = useState<Blob | null>(null);

  // 事前変換済み PNG（クリップボード用）
  const [pngBlob, setPngBlob]     = useState<Blob | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  // クリップボードへのコピー状態
  const [copyDone, setCopyDone]         = useState(false);
  const [copyError, setCopyError]       = useState(false);
  const [copyErrorMsg, setCopyErrorMsg] = useState("");

  // URL 入力
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState("");

  const [isDragging, setIsDragging] = useState(false);
  const zoneRef     = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── imageBlob → PNG 事前変換 ──────────────────────────
  useEffect(() => {
    if (!imageBlob) { setPngBlob(null); return; }
    if (imageBlob.type === "image/png") { setPngBlob(imageBlob); return; }
    convertToPng(imageBlob).then(setPngBlob).catch(() => setPngBlob(null));
  }, [imageBlob]);

  // ── sourceUrl → プロキシ経由取得 → PNG 変換 ────────────
  useEffect(() => {
    if (!sourceUrl) { setPngBlob(null); return; }
    const controller = new AbortController();
    setIsFetching(true);
    setPngBlob(null);
    setCopyDone(false);
    setCopyError(false);

    fetch(`/api/image-proxy?url=${encodeURIComponent(sourceUrl)}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => (b ? convertToPng(b) : null))
      .then((png) => { if (png) setPngBlob(png); })
      .catch(() => {})
      .finally(() => setIsFetching(false));

    return () => controller.abort();
  }, [sourceUrl]);

  // ── 画像データ処理 ────────────────────────────────────
  const processItems = useCallback(
    (items: DataTransferItemList) => {
      const arr = Array.from(items);

      // ① バイナリ画像データを最優先（右クリック「画像をコピー」で確実に取れる）
      //    プロキシ不要・ホットリンク制限なし
      const imgItem = arr.find(
        (i) => i.kind === "file" && i.type.startsWith("image/")
      );
      if (imgItem) {
        setFromFile(imgItem.getAsFile());
        return;
      }

      // ② バイナリがない場合のみ HTML の img src URL を試みる
      const htmlItem = arr.find((i) => i.type === "text/html");
      if (htmlItem) {
        htmlItem.getAsString((html) => {
          const m = html.match(/src="(https?:\/\/[^"]+)"/);
          if (m) {
            if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null); }
            setImageBlob(null);
            setSourceUrl(m[1]);
            setPreviewUrl(m[1]);
            setCopyDone(false);
          }
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [blobUrl]
  );

  const setFromFile = (file: File | null) => {
    if (!file) return;
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    const url = URL.createObjectURL(file);
    setBlobUrl(url);
    setPreviewUrl(url);
    setSourceUrl(null);
    setImageBlob(file);
    setCopyDone(false);
    setCopyError(false);
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (e.clipboardData?.items) processItems(e.clipboardData.items);
    },
    [processItems]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer?.items)
        processItems(e.dataTransfer.items as unknown as DataTransferItemList);
    },
    [processItems]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFromFile(e.target.files?.[0] ?? null);
  };

  const handleUrlSubmit = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) { setUrlError("URLを入力してください"); return; }
    if (!/^https?:\/\/.+/.test(trimmed)) {
      setUrlError("https:// から始まるURLを入力してください");
      return;
    }
    setUrlError("");
    if (blobUrl) { URL.revokeObjectURL(blobUrl); setBlobUrl(null); }
    setImageBlob(null);
    setSourceUrl(trimmed);
    setPreviewUrl(trimmed);
    setUrlInput("");
    setCopyDone(false);
    setCopyError(false);
  };

  const clear = () => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setPreviewUrl(null);
    setSourceUrl(null);
    setBlobUrl(null);
    setImageBlob(null);
    setPngBlob(null);
    setCopyDone(false);
    setCopyError(false);
  };

  // ── STEP 1: クリップボードへコピー ───────────────────
  const copyToClipboard = async () => {
    let target: Blob | null = pngBlob ?? imageBlob;

    // pngBlob がない（プロキシ取得失敗など）場合、sourceUrl から再取得を試みる
    if (!target && sourceUrl) {
      try {
        const res = await fetch(
          `/api/image-proxy?url=${encodeURIComponent(sourceUrl)}`
        );
        if (res.ok) {
          const blob = await res.blob();
          target = await convertToPng(blob);
          setPngBlob(target as Blob);
        }
      } catch { /* 再取得失敗 → 後続でエラー表示 */ }
    }

    if (!target) {
      setCopyError(true);
      setCopyErrorMsg(
        "Yahoo オークションの画像URLは外部から取得できません（アクセス制限）。\n" +
        "代わりに ① Win+Shift+S でスクリーンショット → 「📋 貼り付け」タブに Ctrl+V、または ② 商品画像を右クリック →「画像をコピー」→ 「📋 貼り付け」タブに Ctrl+V をお試しください。"
      );
      return;
    }

    try {
      const png =
        target.type === "image/png" ? target : await convertToPng(target);
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": png }),
      ]);
      setCopyDone(true);
      setCopyError(false);
      setCopyErrorMsg("");
    } catch {
      setCopyError(true);
      setCopyErrorMsg(
        "クリップボードへの書き込みに失敗しました。アドレスバー左の🔒をクリックし「クリップボード」を許可してください。"
      );
    }
  };

  // ── STEP 2: Google Lens を開く（別クリック = ポップアップOK）──
  const openLens = () => {
    window.open("https://lens.google.com/?hl=ja", "_blank");
  };

  const TABS: { id: InputTab; label: string }[] = [
    { id: "paste", label: "📋 貼り付け" },
    { id: "url",   label: "🔗 URL入力" },
    { id: "tips",  label: "💡 右クリックできない場合" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      {/* ヘッダー */}
      <button
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-base">📷</span>
          画像を貼り付けて仕入れ先を検索
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100">
          {previewUrl ? (
            /* ── プレビューがある場合 ── */
            <div className="px-4 py-3 space-y-3">
              {/* 画像プレビュー */}
              <div className="relative rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="検索する画像" className="w-full max-h-52 object-contain" />
                <button
                  onClick={clear}
                  className="absolute top-2 right-2 w-7 h-7 bg-slate-800/60 hover:bg-slate-800 text-white rounded-full text-sm flex items-center justify-center"
                >×</button>
                <span className={`absolute bottom-2 left-2 text-xs px-2 py-0.5 rounded-full ${
                  sourceUrl ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                }`}>
                  {sourceUrl ? "✓ URL取得済み" : "📷 ローカル画像"}
                </span>
              </div>

              {isFetching && (
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 animate-spin text-blue-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  画像を取得中…（このまま待つか、準備完了前でもコピーできます）
                </p>
              )}

              {/* ── STEP 1 ── */}
              <div className="rounded-xl border border-slate-200 p-3 space-y-2">
                <p className="text-xs font-bold text-slate-600">① 画像をクリップボードにコピー</p>
                {copyError && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    ⚠️ {copyErrorMsg}
                  </p>
                )}
                {copyDone ? (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <span className="text-emerald-600 font-bold text-sm">✅ コピーしました！</span>
                    <button
                      onClick={() => setCopyDone(false)}
                      className="ml-auto text-xs text-slate-400 hover:text-slate-600"
                    >再コピー</button>
                  </div>
                ) : (
                  <button
                    onClick={copyToClipboard}
                    disabled={!pngBlob && !imageBlob && !sourceUrl}
                    className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors ${
                      pngBlob || imageBlob || sourceUrl
                        ? "bg-slate-700 hover:bg-slate-900 text-white"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    📋 画像をコピーする
                  </button>
                )}
              </div>

              {/* ── STEP 2 ── */}
              <div className={`rounded-xl border p-3 space-y-2 transition-opacity ${
                copyDone ? "border-blue-300 bg-blue-50" : "border-slate-200 opacity-60"
              }`}>
                <p className="text-xs font-bold text-slate-600">② Google Lens を開いて Ctrl+V で貼り付け</p>
                <button
                  onClick={openLens}
                  className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-bold text-sm transition-colors ${
                    copyDone
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                  disabled={!copyDone}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Google Lens を開く
                </button>
                {copyDone && (
                  <p className="text-xs text-blue-700 font-semibold text-center">
                    👆 開いたら <kbd className="bg-blue-100 border border-blue-300 rounded px-1.5 py-0.5 font-mono">Ctrl+V</kbd> を押して画像を貼り付けてください
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* ── 画像なし: タブ切り替え ── */
            <div>
              <div className="flex border-b border-slate-100">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      activeTab === tab.id
                        ? "text-blue-600 border-b-2 border-blue-600 -mb-px"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="px-4 py-3">
                {activeTab === "paste" && (
                  <div className="space-y-2">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800 space-y-1.5">
                      <p className="font-bold">📸 商品画像のスクリーンショットを貼り付ける</p>
                      <p>
                        <span className="font-semibold">方法①</span>　画像の<strong>外側</strong>で右クリック →「<strong>スクリーンショット</strong>」→ 範囲を選択
                      </p>
                      <p>
                        <span className="font-semibold">方法②</span>　<kbd className="bg-blue-100 border border-blue-300 rounded px-1 font-mono">Win+Shift+S</kbd> → 範囲を選択
                      </p>
                      <p className="text-blue-600">↓ その後、下の枠をクリック → <kbd className="bg-blue-100 border border-blue-300 rounded px-1 font-mono">Ctrl+V</kbd></p>
                    </div>
                    <div
                      ref={zoneRef}
                      tabIndex={0}
                      onPaste={handlePaste}
                      onDrop={handleDrop}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onClick={() => zoneRef.current?.focus()}
                      className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer outline-none transition-colors ${
                        isDragging
                          ? "border-blue-400 bg-blue-50"
                          : "border-slate-200 hover:border-blue-300 focus:border-blue-400 focus:bg-blue-50/30"
                      }`}
                    >
                      <p className="text-3xl mb-1.5">📋</p>
                      <p className="text-sm font-semibold text-slate-600">
                        ここをクリック → Ctrl+V で貼り付け
                      </p>
                      <p className="text-xs text-slate-400 mt-1">または画像ファイルをドロップ</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                        className="mt-2.5 px-3 py-1.5 text-xs border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 transition-colors"
                      >
                        ファイルを選択
                      </button>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    </div>
                  </div>
                )}

                {activeTab === "url" && (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500">
                      右クリック →「画像アドレスをコピー」で取得したURLを貼り付けてください。
                    </p>
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      ⚠️ Yahoo オークションの画像URLはアクセス制限のため取得できません。<br />
                      Yahoo 画像は <strong>「📋 貼り付け」タブ</strong> から右クリック「画像をコピー」または Win+Shift+S スクリーンショットをご利用ください。
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => { setUrlInput(e.target.value); setUrlError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                        placeholder="https://... （画像のURL）"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        onClick={handleUrlSubmit}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap"
                      >
                        セット
                      </button>
                    </div>
                    {urlError && <p className="text-xs text-red-500">{urlError}</p>}
                  </div>
                )}

                {activeTab === "tips" && (
                  <div className="space-y-3 text-xs">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1.5">
                      <p className="font-bold text-blue-800">① ブラウザの「スクリーンショット」を使う（推奨）</p>
                      <ol className="text-blue-700 space-y-0.5 list-decimal list-inside">
                        <li>商品画像の<strong>外側（余白部分）</strong>で右クリック</li>
                        <li>メニューから「<strong>スクリーンショット</strong>」を選択</li>
                        <li>商品画像の範囲をドラッグして選択 → 確定</li>
                        <li>「📋 貼り付け」タブをクリック → <kbd className="bg-blue-100 border border-blue-300 rounded px-1 font-mono">Ctrl+V</kbd></li>
                        <li>「📋 画像をコピーする」→「Google Lens を開く」→ Lens で <kbd className="bg-blue-100 border border-blue-300 rounded px-1 font-mono">Ctrl+V</kbd></li>
                      </ol>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 space-y-1.5">
                      <p className="font-bold text-emerald-800">② Win+Shift+S を使う</p>
                      <ol className="text-emerald-700 space-y-0.5 list-decimal list-inside">
                        <li><kbd className="bg-emerald-100 border border-emerald-300 rounded px-1 font-mono">Win+Shift+S</kbd> を押す</li>
                        <li>商品画像の範囲をドラッグして選択</li>
                        <li>「📋 貼り付け」タブをクリック → <kbd className="bg-emerald-100 border border-emerald-300 rounded px-1 font-mono">Ctrl+V</kbd></li>
                        <li>「📋 画像をコピーする」→「Google Lens を開く」→ Lens で <kbd className="bg-emerald-100 border border-emerald-300 rounded px-1 font-mono">Ctrl+V</kbd></li>
                      </ol>
                    </div>
                    <p className="text-slate-400 text-center">
                      ※ Yahoo オークションは画像上の右クリックを制限しているため<br/>「画像をコピー」は使用できません
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

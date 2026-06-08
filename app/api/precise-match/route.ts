import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * ヤフオク仕入れ候補について、
 * 「画像の一致度」「名称・型番の整合性」「利益が出るか」を
 * Claude Vision ＋ サーバー側計算でまとめて判定するAPI。
 *
 * ユーザーがボタンを押した時だけ呼び出される（AI利用上限を消費するため）。
 */
export async function POST(request: NextRequest) {
  const apiKey = process.env.SHIIRE_ANTHROPIC_KEY;

  if (!apiKey || apiKey.startsWith("ここに")) {
    return NextResponse.json(
      { error: "SHIIRE_ANTHROPIC_KEY が未設定です" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const {
    imageUrl,
    title,
    price,
    brand,
    category,
    modelNumber,
    referenceName,
    referenceDescription,
    mercariPriceMin,
    mercariPriceMax,
  } = body as {
    imageUrl: string;
    title: string;
    price: number;
    brand?: string;
    category?: string;
    modelNumber?: string;
    referenceName?: string;
    referenceDescription?: string;
    mercariPriceMin?: number;
    mercariPriceMax?: number;
  };

  if (!imageUrl || !title) {
    return NextResponse.json(
      { error: "imageUrl と title が必要です" },
      { status: 400 }
    );
  }

  // ── 利益計算（サーバー側で確定計算。AIの推測に頼らない）──────
  const MERCARI_FEE_RATE = 0.1;
  const SHIPPING_COST = 1000;
  const hasPriceRange = (mercariPriceMin ?? 0) > 0 && (mercariPriceMax ?? 0) > 0;
  const refSellPrice = hasPriceRange
    ? Math.round(((mercariPriceMin as number) + (mercariPriceMax as number)) / 2)
    : Math.max(mercariPriceMax ?? 0, 0);
  const maxPurchase =
    refSellPrice > 0 ? Math.floor(refSellPrice * (1 - MERCARI_FEE_RATE) - SHIPPING_COST) : 0;
  const estimatedProfit = refSellPrice > 0 ? maxPurchase - price : null;
  const profitable = estimatedProfit !== null ? estimatedProfit >= 0 : null;

  // ── 画像取得（Yahoo ホットリンク保護対策）──────────────
  let imageBase64: string;
  let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" = "image/jpeg";

  try {
    const imgRes = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: new URL(imageUrl).origin,
        Accept: "image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
      },
      cache: "no-store",
    });

    if (!imgRes.ok) throw new Error(`HTTP ${imgRes.status}`);

    const ct = imgRes.headers.get("content-type") ?? "image/jpeg";
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
    const matched = validTypes.find((t) => ct.includes(t));
    if (matched) mediaType = matched;

    const buf = await imgRes.arrayBuffer();
    imageBase64 = Buffer.from(buf).toString("base64");
  } catch (err) {
    console.error("precise-match: 画像取得失敗", err);
    return NextResponse.json(
      {
        error:
          "商品画像を取得できませんでした。画像が削除されたか、アクセス制限の可能性があります。",
      },
      { status: 200 }
    );
  }

  // ── Claude Vision で画像一致度・名称整合性を判定 ──────────
  const client = new Anthropic({ apiKey });

  const targetInfo = [
    brand ? `ブランド: ${brand}` : "",
    category ? `カテゴリ: ${category}` : "",
    modelNumber ? `型番（ユーザー指定）: ${modelNumber}` : "",
    referenceName ? `ターゲット商品名: ${referenceName}` : "",
    referenceDescription ? `ターゲット商品の特徴・補足: ${referenceDescription}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const prompt = `あなたは中古ブランド品の仕入れ判断を支援する専門家です。
以下の画像は、仕入れ候補としてヤフオクに出品されている商品の画像です。

【出品タイトル】${title}

【狙っている商品の情報】
${targetInfo || "（詳細指定なし。画像とタイトルから常識的に判断してください）"}

【あなたのタスク】
この出品が「狙っている商品」と仕入れる価値がある程度に一致しているかを、次の2つの観点で判定してください。

1. 画像一致度：型番・デザイン・色・素材・形状が、ターゲット情報と視覚的に一致しているか
   - 色違いは許容（同じ型・デザインであればOK）
   - デザイン・形状・素材が異なる場合は不一致と判断する
2. 名称・型番の整合性：出品タイトルに含まれる型番・名称が、ターゲット情報と矛盾していないか

必ず以下のJSON形式のみで回答してください（説明文・前置き不要）：
{
  "imageMatchLevel": "高い" または "中程度" または "低い",
  "imageMatchNote": "判定理由（1文、具体的に。何が一致/不一致かを明記）",
  "nameConsistent": true または false,
  "nameConsistencyNote": "理由（1文）"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: imageBase64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const textContent =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AIの応答を解析できませんでした" },
        { status: 200 }
      );
    }

    const aiResult = JSON.parse(jsonMatch[0]) as {
      imageMatchLevel: "高い" | "中程度" | "低い";
      imageMatchNote: string;
      nameConsistent: boolean;
      nameConsistencyNote: string;
    };

    // ── 総合判定（画像一致度 × 名称整合性 × 利益）─────────
    let verdict: "有望" | "要確認" | "非推奨";
    if (aiResult.imageMatchLevel === "低い" || aiResult.nameConsistent === false || profitable === false) {
      verdict = "非推奨";
    } else if (aiResult.imageMatchLevel === "高い" && aiResult.nameConsistent) {
      verdict = "有望";
    } else {
      verdict = "要確認";
    }

    return NextResponse.json({
      imageMatch: { level: aiResult.imageMatchLevel, note: aiResult.imageMatchNote },
      nameConsistency: { ok: aiResult.nameConsistent, note: aiResult.nameConsistencyNote },
      profit: {
        maxPurchase,
        estimatedProfit,
        profitable,
        refSellPrice,
      },
      verdict,
    });
  } catch (err) {
    console.error("precise-match Claude error:", err);
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `APIエラー: ${err.message}` },
        { status: err.status ?? 500 }
      );
    }
    return NextResponse.json({ error: "AI分析に失敗しました" }, { status: 500 });
  }
}

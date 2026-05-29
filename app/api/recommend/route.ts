import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const apiKey = process.env.SHIIRE_ANTHROPIC_KEY;

  if (!apiKey || apiKey.startsWith("ここに")) {
    return NextResponse.json(
      { error: "SHIIRE_ANTHROPIC_KEY が未設定です。.env.local を編集してください。" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { brand, category, modelNumber, priceMin, priceMax } = body;

  if (!brand) {
    return NextResponse.json({ error: "ブランド名が必要です" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  // ── 仕入れ上限額の計算 ──────────────────────────────
  // 仕入れ上限 = メルカリ販売価格 × (1 - 手数料10%) - 送料1,000円
  const MERCARI_FEE_RATE = 0.10;
  const SHIPPING_COST = 1000;

  const hasPriceRange = priceMin > 0 && priceMax > 0;
  const priceNote = hasPriceRange
    ? `¥${Number(priceMin).toLocaleString()}〜¥${Number(priceMax).toLocaleString()}`
    : priceMax > 0
    ? `〜¥${Number(priceMax).toLocaleString()}`
    : "価格帯指定なし";

  // 最も保守的な仕入れ上限（最安値で売れた場合でも赤字にならない額）
  const maxPurchaseFromMin = hasPriceRange
    ? Math.floor(priceMin * (1 - MERCARI_FEE_RATE) - SHIPPING_COST)
    : 0;
  // 最大仕入れ上限（最高値で売れた場合）
  const maxPurchaseFromMax =
    priceMax > 0
      ? Math.floor(priceMax * (1 - MERCARI_FEE_RATE) - SHIPPING_COST)
      : 0;

  const budgetConstraint = hasPriceRange
    ? `¥${maxPurchaseFromMin.toLocaleString()}〜¥${maxPurchaseFromMax.toLocaleString()}（上限 ¥${maxPurchaseFromMax.toLocaleString()}）`
    : maxPurchaseFromMax > 0
    ? `¥${maxPurchaseFromMax.toLocaleString()} 以下`
    : "価格帯未設定のため制限なし";

  const prompt = `あなたは日本のブランド品リサイクル・中古品売買の専門家です。
商品知識のない初心者でも識別・購入できる商品を、具体的に提案してください。

【検索条件】
ブランド: ${brand}
カテゴリ: ${category || "指定なし"}
品番・型番の参考: ${modelNumber || "なし"}
メルカリでの取引価格帯: ${priceNote}

【仕入れ予算の計算】
計算式: メルカリ販売価格 × 0.9（手数料10%控除）− 1,000円（送料）= 仕入れ上限
仕入れ可能額: ${budgetConstraint}

【あなたのタスク】
上記条件に合う「需要が高く、初心者でも仕入れて利益を出せる」商品を3〜5点、今すぐ仕入れるべき商品として断定してください。

【必須制約】
1. purchaseTargetPrice は必ず「仕入れ可能額」の範囲内（上限 ¥${maxPurchaseFromMax > 0 ? maxPurchaseFromMax.toLocaleString() : "制限なし"}）にすること
2. この仕入れ価格でヤフオクやリサイクルショップで実際に入手できる現実的な価格であること
3. 品番・型番は必須（初心者がヤフオクや店頭で商品を特定できるように）
4. メルカリでの実際の需要・価格帯に基づいた現実的な提案であること

必ずJSON形式のみで回答してください（説明文は不要）:
{
  "recommendations": [
    {
      "name": "具体的な商品名（日本語）",
      "modelNumber": "品番・型番（例：F25938、GG001）",
      "demandLevel": "高",
      "estimatedSellPrice": 15000,
      "purchaseTargetPrice": 8000,
      "reason": "今これを仕入れるべき理由（1〜2文、具体的に）",
      "searchKeyword": "ヤフオクで検索するキーワード（品番含む）",
      "tips": "初心者向け識別ポイント・注意点（1文）"
    }
  ],
  "marketSummary": "このカテゴリの市場動向コメント（1文）"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AIの応答を解析できませんでした" },
        { status: 500 }
      );
    }

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Anthropic API error:", err);
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `APIエラー: ${err.message}` },
        { status: err.status ?? 500 }
      );
    }
    return NextResponse.json({ error: "AI分析に失敗しました" }, { status: 500 });
  }
}

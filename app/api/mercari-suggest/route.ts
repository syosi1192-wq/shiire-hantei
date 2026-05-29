import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.SHIIRE_ANTHROPIC_KEY });

export async function POST(request: NextRequest) {
  const { brand, category, modelNumber } = await request.json();

  if (!brand) {
    return NextResponse.json({ error: "ブランド名が必要です" }, { status: 400 });
  }

  const keyword = [brand, category, modelNumber].filter(Boolean).join(" ");

  const prompt = `あなたはメルカリの売れ筋に詳しい専門家です。

ブランド: ${brand}
カテゴリ: ${category || "指定なし"}
型番・品番: ${modelNumber || "指定なし"}

このブランド・カテゴリで、現在メルカリで売れている可能性が高い商品を3件ピックアップしてください。

以下のJSON形式のみで返してください（説明文・コードブロック不要）:
{
  "suggestions": [
    { "name": "商品名", "estimatedPrice": 推定販売価格（整数）},
    { "name": "商品名", "estimatedPrice": 推定販売価格（整数）},
    { "name": "商品名", "estimatedPrice": 推定販売価格（整数）}
  ]
}

条件:
- nameは「${brand} ＋ 商品種類 ＋ 特徴（色・素材・型番等）」の形式で日本語
- estimatedPriceはメルカリでの売り切れ実績の中央値（円）
- 需要が高く取引が多い商品を優先する
- 型番・品番が指定されている場合はその商品を中心に提案する`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("JSONパース失敗");

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ suggestions: data.suggestions ?? [], keyword });
  } catch (err) {
    console.error("mercari-suggest error:", err);
    return NextResponse.json(
      { error: "AI提案の取得に失敗しました" },
      { status: 500 }
    );
  }
}

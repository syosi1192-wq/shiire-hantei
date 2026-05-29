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
  const { text, keyword } = body as { text: string; keyword: string };

  if (!text || text.trim().length < 50) {
    return NextResponse.json(
      { error: "テキストが短すぎます。メルカリのページ全体をコピーして貼り付けてください。" },
      { status: 400 }
    );
  }

  const client = new Anthropic({ apiKey });

  const prompt = `あなたはメルカリの取引データを分析する専門家です。
以下のテキストは、メルカリの「${keyword || ""}」の売り切れ検索結果ページ（新しい順）をブラウザからコピーしたものです。

このテキストから売れ筋商品を分析してください。
分析のポイント：
- 同じ商品名・型番・シリーズが複数回出現 → よく売れているパターン
- ページ上部に出現 → より最近売れた
- 価格帯のばらつきが少ない → 安定した需要がある

【コピーされたテキスト】
${text.slice(0, 8000)}

上記テキストを分析して、以下のJSON形式のみで回答してください（余分な説明文は不要）：

{
  "topProducts": [
    {
      "name": "商品名・パターン（具体的に。例：コーチ シグネチャー トートバッグ）",
      "priceRange": "¥3,000〜¥8,000",
      "priceMin": 3000,
      "priceMax": 8000,
      "salesFrequency": "多い",
      "recentCount": 8,
      "reason": "なぜ売れ筋か（1文、具体的に）",
      "searchKeyword": "ヤフオクで仕入れ検索するキーワード（品番を含めると良い）"
    }
  ],
  "summary": "全体の市場感コメント（2文以内）",
  "bestBuyTarget": "最もおすすめの仕入れターゲット（1文、具体的な商品名・価格帯を含む）"
}

制約：
- topProductsは多くても10件
- salesFrequencyは「多い」「普通」「少ない」のいずれか
- recentCountはテキスト中に確認できた件数（推定で構わない）
- 情報が不足していても、見つけた範囲でできる限り回答すること`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const textResponse =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AIの応答を解析できませんでした。テキストが正しくコピーされているか確認してください。" },
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

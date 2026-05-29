import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

/**
 * ヤフオクの商品画像を Claude Vision で解析し、
 * メルカリで視覚的に類似した商品だけを絞り込めるような
 * 精密な検索キーワードを返す API。
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
  const { imageUrl, title } = body as { imageUrl: string; title: string };

  if (!imageUrl) {
    return NextResponse.json({ refinedKeyword: null, error: "imageUrl が必要です" }, { status: 400 });
  }

  // ── 画像をサーバーサイドで取得（Yahoo ホットリンク保護対策）──
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

    if (!imgRes.ok) {
      throw new Error(`HTTP ${imgRes.status}`);
    }

    const ct = imgRes.headers.get("content-type") ?? "image/jpeg";
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
    const matched = validTypes.find((t) => ct.includes(t));
    if (matched) mediaType = matched;

    const buf = await imgRes.arrayBuffer();
    imageBase64 = Buffer.from(buf).toString("base64");
  } catch (err) {
    console.error("refine-keyword: 画像取得失敗", err);
    // 画像取得失敗 → フロントエンドはテキストフォールバックを使う
    return NextResponse.json({ refinedKeyword: null, fallback: true });
  }

  // ── Claude Vision でキーワード生成 ──
  const client = new Anthropic({ apiKey });

  const prompt = `この画像はヤフオクに出品されているブランド中古品です。
出品タイトル: ${title}

【あなたのタスク】
この画像を見て、メルカリで「この商品と見た目が同じ・似た商品」だけを検索できる精密なキーワードを作成してください。

含めるべき情報（客観的・識別可能なもののみ）:
- ブランド名（ロゴ・刻印から読み取れる場合）
- 商品の種類（トートバッグ、二つ折り財布、ショルダーバッグ等）
- 主な色（例: キャメル、ブラック、ネイビー）
- 素材（例: レザー、コーティングキャンバス、ナイロン）
- 柄・デザイン（例: シグネチャー柄、モノグラム、無地、チェック）
- 型番（画像から読み取れる場合のみ）

絶対に含めてはいけないもの:
- サイズ感・大きさの形容（大きめ、小さめ、コンパクト、横長 等）
- 状態・品質の形容（きれい、美品、綺麗、良品 等）
- 主観的な印象（おしゃれ、かわいい、シンプル 等）
- 用途・シーン（通勤、普段使い 等）

以下のJSON形式のみで回答（説明文・前置き不要）:
{
  "refinedKeyword": "ブランド名 商品種類 色 素材/柄（客観的な識別情報のみ・5語以内）",
  "description": "この商品の外見的特徴の要約（1文）"
}

例: {"refinedKeyword": "コーチ トートバッグ ブラウン シグネチャーキャンバス", "description": "コーチのブラウン系シグネチャー柄コーティングキャンバス製トートバッグ"}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: imageBase64,
              },
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
      return NextResponse.json({ refinedKeyword: null, fallback: true });
    }

    const data = JSON.parse(jsonMatch[0]);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Claude Vision error:", err);
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { refinedKeyword: null, error: `APIエラー: ${err.message}`, fallback: true },
        { status: 200 } // 200 で返してフロントはフォールバックを使う
      );
    }
    return NextResponse.json({ refinedKeyword: null, fallback: true });
  }
}

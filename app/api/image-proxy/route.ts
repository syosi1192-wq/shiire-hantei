import { NextRequest, NextResponse } from "next/server";

/**
 * 画像 URL をサーバーサイドで取得してクライアントに返すプロキシ。
 * Yahoo オークションなどホットリンク保護のある URL でも取得できるようにする。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "url パラメータが必要です" }, { status: 400 });
  }

  // 安全チェック: HTTP/HTTPS のみ許可
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: "無効な URL です" }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: new URL(url).origin,
        Accept: "image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `画像の取得に失敗しました (HTTP ${res.status})` },
        { status: 502 }
      );
    }

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        // CORS を許可してクライアント側で blob に変換できるようにする
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("image-proxy error:", err);
    return NextResponse.json({ error: "画像取得エラー" }, { status: 500 });
  }
}

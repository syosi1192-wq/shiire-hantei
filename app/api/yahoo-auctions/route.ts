import { NextRequest, NextResponse } from "next/server";
import { YahooAuctionItem } from "../../types";

/**
 * 末尾の単語が品番・型番らしい場合に除いた短縮クエリを返す。
 * 例: "バーバリー ノバチェック 8014345" → "バーバリー ノバチェック"
 *      "コーチ トートバッグ F58282" → "コーチ トートバッグ"
 */
function stripTrailingProductCode(query: string): string | null {
  const words = query.trim().split(/\s+/);
  if (words.length <= 1) return null;
  const last = words[words.length - 1];
  const isCode =
    /^\d{4,}$/.test(last) ||
    /^[A-Za-z]{1,5}\d{2,}[A-Za-z0-9]*$/.test(last);
  if (!isCode) return null;
  return words.slice(0, -1).join(" ");
}

/** HTML エンティティを簡易デコード */
function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * 検索クエリの各単語がタイトルに含まれているかチェックしてフィルタリングする。
 * ブランド名（先頭語）は必須。2語目以降は「いずれか1つ以上」で OK とする。
 */
function filterByKeywords(
  items: YahooAuctionItem[],
  query: string
): YahooAuctionItem[] {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items;

  // 先頭語（ブランド名）は必須条件
  const brandWord = words[0].toLowerCase();

  return items.filter((item) => {
    const title = item.title.toLowerCase();
    // ブランド名がタイトルに含まれていない → 除外
    return title.includes(brandWord);
  });
}

/** Yahoo オークション検索ページをスクレイピングして商品一覧を返す */
async function scrapeYahooAuctions(
  query: string,
  condition?: string | null,
  maxPrice?: number | null
): Promise<{ items: YahooAuctionItem[]; total: number }> {
  const searchUrl = new URL(
    "https://auctions.yahoo.co.jp/search/search"
  );
  searchUrl.searchParams.set("p", query);
  searchUrl.searchParams.set("tab_ex", "commerce");
  searchUrl.searchParams.set("ei", "utf-8");
  searchUrl.searchParams.set("n", "20");

  // メルカリ観測上限価格でフィルタリング（仕入れ目的なのでこれより安い物だけ）
  if (maxPrice && maxPrice > 0) {
    searchUrl.searchParams.set("aucmaxprice", String(maxPrice));
  }

  // 商品状態フィルター
  if (condition === "new") {
    searchUrl.searchParams.set("aucmin", "1");
  } else if (condition === "used") {
    searchUrl.searchParams.set("aucmin", "0");
    searchUrl.searchParams.set("aucmax", "0");
  }

  const res = await fetch(searchUrl.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
    },
    cache: "no-store",
  });

  // Yahoo オークションは結果があっても 404 を返すことがあるため
  // ステータスコードに関わらず HTML を解析する
  // 500 系のみ致命的エラーとして扱う
  if (res.status >= 500) {
    throw new Error(`Yahoo Auctions HTTP ${res.status}`);
  }

  const html = await res.text();

  // data-auction-id ごとに出現箇所を走査してアイテムを抽出
  const seen = new Set<string>();
  const items: YahooAuctionItem[] = [];
  const idRegex = /data-auction-id="([^"]+)"/g;
  let match;

  while ((match = idRegex.exec(html)) !== null) {
    const id = match[1];
    if (seen.has(id)) continue;

    // IDが現れた箇所の前後をコンテキストとして取得
    const ctxStart = Math.max(0, match.index - 200);
    const ctxEnd = Math.min(html.length, match.index + 2000);
    const ctx = html.slice(ctxStart, ctxEnd);

    const titleM = ctx.match(/data-auction-title="([^"]*)"/);
    const priceM = ctx.match(/data-auction-price="(\d+)"/);
    const imgM = ctx.match(/data-auction-img="([^"]*)"/);
    const endM = ctx.match(/data-auction-endtime="(\d+)"/);
    const hrefM = ctx.match(
      /href="(https:\/\/auctions\.yahoo\.co\.jp\/jp\/auction\/[^"]+)"/
    );

    // タイトルと価格とURLが揃っているアイテムのみ採用
    if (!titleM || !priceM || !hrefM) continue;

    seen.add(id);

    const endTimeMs = endM ? parseInt(endM[1]) * 1000 : 0;

    // 商品状態バッジ（新品 = Product__icon--new 等）
    const isNewBadge = ctx.includes("Product__icon--new");

    items.push({
      auctionId: id,
      title: decodeHtmlEntities(titleM[1]),
      currentPrice: parseInt(priceM[1]),
      bids: 0,
      endTime: endTimeMs > 0 ? new Date(endTimeMs).toISOString() : "",
      thumbnailUrl: imgM ? imgM[1] : "",
      url: hrefM[1],
      condition: isNewBadge ? "new" : "used",
    });

    if (items.length >= 12) break;
  }

  return { items, total: items.length };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const condition = searchParams.get("condition");
  const maxPriceParam = searchParams.get("maxPrice");
  const maxPrice = maxPriceParam ? parseInt(maxPriceParam) : null;

  if (!query) {
    return NextResponse.json({ error: "query が必要です" }, { status: 400 });
  }

  try {
    let { items } = await scrapeYahooAuctions(query, condition, maxPrice);

    // ブランド名がタイトルに含まれない商品を除外
    items = filterByKeywords(items, query);
    let usedQuery = query;

    // 0件のとき末尾の品番を除いて再検索
    if (items.length === 0) {
      const fallbackQuery = stripTrailingProductCode(query);
      if (fallbackQuery) {
        const fallback = await scrapeYahooAuctions(fallbackQuery, condition, maxPrice);
        // フォールバック結果にも同じフィルターを適用（ブランド名は元クエリから判定）
        items = filterByKeywords(fallback.items, fallbackQuery);
        usedQuery = fallbackQuery;
      }
    }

    return NextResponse.json({
      items,
      total: items.length,
      usedQuery,
    });
  } catch (err) {
    console.error("Yahoo Auctions scrape error:", err);
    return NextResponse.json(
      { error: "ヤフオク検索に失敗しました" },
      { status: 500 }
    );
  }
}

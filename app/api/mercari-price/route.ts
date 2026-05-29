import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword");

  if (!keyword) {
    return NextResponse.json({ prices: [], avg: null, min: null, max: null, count: 0 });
  }

  try {
    const res = await fetch("https://api.mercari.jp/v2/entities:search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "X-Platform": "web",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
        "DPR": "2",
        "Viewport-Width": "390",
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
      body: JSON.stringify({
        userId: "",
        pageSize: 6,
        pageToken: "",
        searchSessionId: Math.random().toString(36).slice(2),
        indexRouting: "INDEX_ROUTING_SOLD_ITEMS",
        thumbnailTypes: [],
        searchCondition: {
          keyword,
          excludeKeyword: "",
          sort: "SORT_SCORE",
          order: "ORDER_DESC",
          status: ["STATUS_SOLD_OUT"],
          categoryId: [],
          brandId: [],
          sellerId: [],
          priceMin: 0,
          priceMax: 0,
          itemConditionId: [],
          shippingPayerId: [],
          colorId: [],
          sizeId: [],
          itemType: "ITEM_TYPE_ALL",
          skuParentCategoryId: [],
        },
        defaultDatasets: ["DATASET_TYPE_MERCARI"],
        serviceFrom: "suruga",
        withItemBrand: false,
        withItemSize: false,
        withItemPromotions: false,
        withItemSizes: false,
        withShops: false,
        withPhotos: false,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn("Mercari API returned:", res.status);
      return NextResponse.json({ prices: [], avg: null, min: null, max: null, count: 0 });
    }

    const data = await res.json();
    // レスポンス形式: { result: { items: [...] } } または { items: [...] }
    const items: Record<string, unknown>[] =
      data?.result?.items ?? data?.items ?? [];

    const prices: number[] = items
      .map((item) => Number(item.price ?? 0))
      .filter((p) => p > 0);

    if (prices.length === 0) {
      return NextResponse.json({ prices: [], avg: null, min: null, max: null, count: 0 });
    }

    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    return NextResponse.json({ prices, avg, min, max, count: prices.length });
  } catch (err) {
    console.error("Mercari price API error:", err);
    return NextResponse.json({ prices: [], avg: null, min: null, max: null, count: 0 });
  }
}

import { NextResponse } from "next/server";

export async function GET() {
  const anthropicKey = process.env.SHIIRE_ANTHROPIC_KEY;
  const yahooId = process.env.YAHOO_APP_ID;
  return NextResponse.json({
    anthropic: {
      set: !!anthropicKey,
      length: anthropicKey?.length ?? 0,
      preview: anthropicKey ? anthropicKey.slice(0, 10) + "..." : "未設定",
    },
    yahoo: {
      set: !!yahooId,
      length: yahooId?.length ?? 0,
      preview: yahooId ? yahooId.slice(0, 10) + "..." : "未設定",
    },
  });
}

import { NextResponse } from "next/server";

// Cache live prices for 15 seconds
let cache: { prices: Record<string, number>; ts: number } | null = null;
const CACHE_TTL = 15_000;

function isMarketOpen(): boolean {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const day = ist.getUTCDay();
  if (day === 0 || day === 6) return false;
  const mins = ist.getUTCHours() * 60 + ist.getUTCMinutes();
  return mins >= 555 && mins <= 930; // 9:15 AM – 3:30 PM IST
}

export async function GET(request: Request) {
  if (!isMarketOpen()) {
    return NextResponse.json({ live: false, prices: {} });
  }

  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ live: true, prices: cache.prices, cached: true });
  }

  const apiKey      = process.env.KITE_API_KEY!;
  const accessToken = process.env.KITE_ACCESS_TOKEN!;

  if (!apiKey || !accessToken) {
    return NextResponse.json({ live: false, prices: {}, error: "Kite credentials not configured" });
  }

  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers") ?? "";
  const tickers = tickersParam.split(",").map(t => t.trim()).filter(Boolean);

  if (tickers.length === 0) {
    return NextResponse.json({ live: false, prices: {} });
  }

  try {
    // Build query string: i=NSE:TATAPOWER&i=NSE:HAL&...
    const query = tickers.map(t => `i=NSE%3A${encodeURIComponent(t)}`).join("&");
    const url = `https://api.kite.trade/quote?${query}`;

    const res = await fetch(url, {
      headers: {
        "X-Kite-Version": "3",
        "Authorization": `token ${apiKey}:${accessToken}`,
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Kite API error: ${res.status}`);
    }

    const json = await res.json();
    const prices: Record<string, number> = {};

    for (const [key, data] of Object.entries(json.data ?? {})) {
      const ticker = key.replace("NSE:", "");
      prices[ticker] = (data as any).last_price;
    }

    cache = { prices, ts: Date.now() };
    return NextResponse.json({ live: true, prices });

  } catch (err: any) {
    console.error("Live price fetch error:", err?.message);
    if (cache) {
      return NextResponse.json({ live: true, prices: cache.prices, stale: true });
    }
    return NextResponse.json({ live: false, prices: {}, error: err?.message });
  }
}

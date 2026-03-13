import { NextResponse } from "next/server";
import { KiteConnect } from "kiteconnect";

// Cache live prices for 15 seconds to avoid hammering Kite on multiple users
let cache: { prices: Record<string, number>; ts: number } | null = null;
const CACHE_TTL = 15_000; // 15 seconds

function isMarketOpen(): boolean {
  const now = new Date();
  // Convert to IST (UTC+5:30)
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const day = ist.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;

  const hh = ist.getUTCHours();
  const mm = ist.getUTCMinutes();
  const mins = hh * 60 + mm;

  // 9:15 AM – 3:30 PM IST
  return mins >= 555 && mins <= 930;
}

export async function GET(request: Request) {
  // Only serve live data during market hours
  if (!isMarketOpen()) {
    return NextResponse.json({ live: false, prices: {} });
  }

  // Return cached data if fresh
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json({ live: true, prices: cache.prices, cached: true });
  }

  const apiKey     = process.env.KITE_API_KEY!;
  const accessToken = process.env.KITE_ACCESS_TOKEN!;

  if (!apiKey || !accessToken) {
    return NextResponse.json({ live: false, prices: {}, error: "Kite credentials not configured" });
  }

  // Read tickers from query param — dashboard sends all tickers it needs
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers") ?? "";
  const tickers = tickersParam.split(",").map(t => t.trim()).filter(Boolean);

  if (tickers.length === 0) {
    return NextResponse.json({ live: false, prices: {} });
  }

  try {
    const kc = new KiteConnect({ api_key: apiKey });
    kc.setAccessToken(accessToken);

    // Format as NSE:TICKER
    const instruments = tickers.map(t => `NSE:${t}`);
    const quotes = await kc.getQuote(instruments);

    const prices: Record<string, number> = {};
    for (const [key, data] of Object.entries(quotes)) {
      // key = "NSE:TATAPOWER", extract ticker
      const ticker = key.replace("NSE:", "");
      prices[ticker] = (data as any).last_price;
    }

    cache = { prices, ts: Date.now() };
    return NextResponse.json({ live: true, prices });

  } catch (err: any) {
    console.error("Live price fetch error:", err?.message);
    // Return stale cache if available rather than failing
    if (cache) {
      return NextResponse.json({ live: true, prices: cache.prices, stale: true });
    }
    return NextResponse.json({ live: false, prices: {}, error: err?.message });
  }
}

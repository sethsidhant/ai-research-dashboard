"use client";

import { useState, useEffect, useRef } from "react";

type Stock = {
  stock: string;
  ticker: string;
  peDeviation: number;
  valuation: string;
  band: string;
  industry: string | null;
  industryPE: number | null;
  industryPEHigh: string | null;
  industryPELow: string | null;
  headlines: string | null;
  lastUpdate: string | null;
  aiSummary: string | null;
  summaryDate: string | null;
  rsi: number | null;
  rsiSignal: string | null;
  above50DMA: boolean;
  above200DMA: boolean;
  dma50Value: number | null;
  dma200Value: number | null;
  classification: string | null;
  suggestedAction: string | null;
  currentPrice: number | null;
  high52W: number | null;
  low52W: number | null;
  pctFrom52WHigh: number | null;
  stockPE: number | null;
  sectorIndex: string | null;
  stock6M: number | null;
  stock1Y: number | null;
  nifty50_6M: number | null;
  nifty50_1Y: number | null;
  nifty500_6M: number | null;
  nifty500_1Y: number | null;
};

type FilingItem = {
  index: string;
  category: string;
  date: string;
  subject: string;
  link: string;
};

type Section = {
  title: string;
  items: FilingItem[];
};

function parseHeadlines(raw: string): Section[] {
  const sections: Section[] = [];
  const parts = raw.split(/━━ (.+?) ━━/);
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i].trim();
    const body = parts[i + 1] ?? "";
    const items = body
      .split(/\n(?=\[)/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((block) => {
        const indexMatch = block.match(/^\[(\d+)\]\s*(.+)?/);
        const dateMatch = block.match(/📅\s*(.+)/);
        const subjectMatch = block.match(/📌\s*(.+)/);
        const linkMatch = block.match(/🔗\s*(.+)/);
        return {
          index: indexMatch?.[1] ?? "",
          category: indexMatch?.[2]?.trim() ?? "",
          date: dateMatch?.[1]?.trim() ?? "",
          subject: subjectMatch?.[1]?.trim() ?? "",
          link: linkMatch?.[1]?.trim() ?? "",
        };
      })
      .filter((item) => item.subject);
    if (items.length > 0) sections.push({ title, items });
  }
  return sections;
}

// Splits text and bolds: **markdown**, numbers with units (%, x, cr, lakh, yrs, years, bps), and standalone numbers
function renderInline(text: string) {
  // First pass: split on **markdown** bold
  const mdParts = text.split(/(\*\*[^*]+\*\*)/g);

  return mdParts.flatMap((part, i) => {
    // Already a markdown bold
    if (part.startsWith("**") && part.endsWith("**")) {
      return [<strong key={`md-${i}`} className="font-bold text-gray-900">{part.slice(2, -2)}</strong>];
    }

    // Second pass: auto-bold numeric patterns in plain text
    // Matches: 3.2x | 45% | ₹1,200 | 3-year | 12 years | 1.5 cr | 200 bps | P/E 24 | 0.8 | 1,234
    const numRegex = /((?:₹\s?)?\d[\d,]*(?:\.\d+)?(?:\s?(?:%|x|X|cr|Cr|lakh|Lakh|bps|BPS|years?|yrs?|quarters?|qtr|months?))?(?:\s?(?:CAGR|YoY|QoQ|TTM))?|\b(?:P\/E|P\/B|EV\/EBITDA|ROE|ROCE|EPS|PAT|EBITDA|Revenue|Sales|Debt|D\/E)\s+\d[\d,]*(?:\.\d+)?)/g;

    const segments: React.ReactNode[] = [];
    let last = 0;
    let match;
    numRegex.lastIndex = 0;

    while ((match = numRegex.exec(part)) !== null) {
      if (match.index > last) {
        segments.push(<span key={`t-${i}-${last}`}>{part.slice(last, match.index)}</span>);
      }
      segments.push(
        <strong key={`n-${i}-${match.index}`} className="font-bold text-gray-900">{match[0]}</strong>
      );
      last = match.index + match[0].length;
    }
    if (last < part.length) {
      segments.push(<span key={`t-${i}-end`}>{part.slice(last)}</span>);
    }
    return segments;
  });
}

function AISummary({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "---" || trimmed === "—--") return null;
        if (/^#{1,3}\s/.test(trimmed) && !/^[\u{1F300}-\u{1FFFF}]/u.test(trimmed.replace(/^#{1,3}\s/, ""))) return null;
        const clean = trimmed.replace(/^#{1,3}\s*/, "");
        if (/^[\u{1F300}-\u{1FFFF}]/u.test(clean)) {
          return (
            <div key={i} className="pt-4 first:pt-0">
              <div className="text-sm font-bold text-gray-900 mb-2">{clean}</div>
            </div>
          );
        }
        if (/Daily Briefing|^\*\*\d+/.test(clean)) return null;
        if (clean.startsWith("_Updated:") || clean.startsWith("Updated:")) {
          return (
            <div key={i} className="text-xs text-gray-400 font-mono pt-3 mt-2 border-t border-gray-200">
              {clean.replace(/_/g, "")}
            </div>
          );
        }
        return (
          <p key={i} className="text-sm text-gray-700 leading-relaxed">
            {renderInline(clean)}
          </p>
        );
      })}
    </div>
  );
}

const bandStyles: Record<string, string> = {
  cheap:    "text-green-700   bg-green-50   border border-green-200",
  discount: "text-emerald-700 bg-emerald-50 border border-emerald-200",
  fair:     "text-gray-600    bg-gray-100   border border-gray-200",
  premium:  "text-amber-700   bg-amber-50   border border-amber-200",
  expensive:"text-red-600     bg-red-50     border border-red-200",
};

function rsiColor(rsi: number | null): string {
  if (rsi === null) return "text-gray-400";
  if (rsi < 30) return "text-emerald-600";
  if (rsi > 70) return "text-red-600";
  return "text-gray-900";
}

function rsiSignalStyle(signal: string | null): string {
  switch (signal) {
    case "Oversold":      return "text-emerald-700 bg-emerald-50 border-emerald-200";
    case "Weakening":     return "text-emerald-600 bg-emerald-50 border-emerald-200";
    case "Neutral":       return "text-gray-600 bg-gray-100 border-gray-200";
    case "Strengthening": return "text-amber-700 bg-amber-50 border-amber-200";
    case "Overbought":    return "text-red-600 bg-red-50 border-red-200";
    default:              return "text-gray-500 bg-gray-50 border-gray-200";
  }
}
}

function ReturnsModal({ stock, onClose }: { stock: Stock; onClose: () => void }) {
  const fmt = (v: number | null) => v != null ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : "—";
  const cls = (s: number | null, b: number | null) =>
    s == null ? "text-gray-400" : s >= (b ?? -Infinity) ? "text-emerald-600" : "text-red-600";

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-72 bg-white border border-gray-300 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div>
            <span className="text-gray-900 font-bold text-sm">{stock.stock}</span>
            <span className="text-gray-400 text-xs font-mono ml-2">Returns</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors text-sm">✕</button>
        </div>
        {/* Returns table */}
        <div className="p-4">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="pb-2 text-left text-gray-400 font-medium"></th>
                <th className="pb-2 text-right text-gray-400 font-medium">6M</th>
                <th className="pb-2 text-right text-gray-400 font-medium">1Y</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-700 font-bold">{stock.ticker}</td>
                <td className={`py-2 text-right font-bold ${cls(stock.stock6M, stock.nifty50_6M)}`}>{fmt(stock.stock6M)}</td>
                <td className={`py-2 text-right font-bold ${cls(stock.stock1Y, stock.nifty50_1Y)}`}>{fmt(stock.stock1Y)}</td>
              </tr>
              <tr className="border-b border-gray-200">
                <td className="py-2 text-gray-400">NIFTY 50</td>
                <td className="py-2 text-right text-gray-400">{fmt(stock.nifty50_6M)}</td>
                <td className="py-2 text-right text-gray-400">{fmt(stock.nifty50_1Y)}</td>
              </tr>
              <tr>
                <td className="py-2 text-gray-400">NIFTY 500</td>
                <td className="py-2 text-right text-gray-400">{fmt(stock.nifty500_6M)}</td>
                <td className="py-2 text-right text-gray-400">{fmt(stock.nifty500_1Y)}</td>
              </tr>
            </tbody>
          </table>
          {/* Beat/lag summary */}
          <div className="mt-3 pt-3 border-t border-gray-200 flex gap-2 flex-wrap">
            {stock.stock6M != null && stock.nifty50_6M != null && (
              <span className={`text-xs font-mono px-2 py-0.5 rounded border ${stock.stock6M >= stock.nifty50_6M ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-red-600 bg-red-50 border-red-200"}`}>
                {stock.stock6M >= stock.nifty50_6M ? "↑ Beating N50 (6M)" : "↓ Lagging N50 (6M)"}
              </span>
            )}
            {stock.stock1Y != null && stock.nifty50_1Y != null && (
              <span className={`text-xs font-mono px-2 py-0.5 rounded border ${stock.stock1Y >= stock.nifty50_1Y ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-red-600 bg-red-50 border-red-200"}`}>
                {stock.stock1Y >= stock.nifty50_1Y ? "↑ Beating N50 (1Y)" : "↓ Lagging N50 (1Y)"}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

type Tab = "summary" | "filings";

function SidePanel({ stock, onClose }: { stock: Stock; onClose: () => void }) {
  const sections = stock.headlines ? parseHeadlines(stock.headlines) : [];
  const [tab, setTab] = useState<Tab>(stock.aiSummary ? "summary" : "filings");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full md:w-[500px] bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-900 text-lg">{stock.stock}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-mono ${bandStyles[stock.band]}`}>
                  {stock.valuation}
                </span>
                {stock.suggestedAction && (
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-blue-50 text-blue-600 border border-blue-200">
                    {stock.suggestedAction}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {stock.currentPrice != null && (
                  <span className="text-sm font-mono font-bold text-gray-900">
                    ₹{stock.currentPrice.toLocaleString("en-IN")}
                  </span>
                )}
                {stock.pctFrom52WHigh != null && (
                  <span className={`text-sm font-mono font-bold ${stock.pctFrom52WHigh <= -20 ? "text-emerald-600" : stock.pctFrom52WHigh <= -10 ? "text-amber-700" : "text-red-600"}`}>
                    {stock.pctFrom52WHigh.toFixed(1)}% from 52W high
                  </span>
                )}
                {stock.stockPE != null && (
                  <span className={`text-sm font-mono font-bold ${
                    stock.band === "cheap"    ? "text-emerald-600" :
                    stock.band === "discount" ? "text-emerald-600" :
                    stock.band === "fair"     ? "text-gray-700"    :
                    stock.band === "premium"  ? "text-amber-700"   :
                                               "text-red-600"
                  }`}>
                    PE {stock.stockPE.toFixed(1)}x
                  </span>
                )}
                {stock.high52W != null && (
                  <span className="text-xs font-mono text-gray-400">
                    52W: <span className="text-emerald-600/70">{stock.high52W.toLocaleString("en-IN")}</span> / <span className="text-red-600/70">{stock.low52W?.toLocaleString("en-IN") ?? "—"}</span>
                  </span>
                )}
              </div>
              {/* DMA indicators */}
              <div className="flex items-center gap-3 mt-1.5">
                <span className={`text-xs font-mono ${stock.above50DMA && stock.above200DMA ? "text-green-500" : stock.above50DMA ? "text-green-600" : "text-red-600"}`}>
                  50 DMA {stock.dma50Value != null ? stock.dma50Value.toLocaleString("en-IN") : stock.above50DMA ? "✓" : "✗"}
                </span>
                <span className={`text-xs font-mono ${stock.above50DMA && stock.above200DMA ? "text-green-500" : stock.above200DMA ? "text-green-600" : "text-red-600"}`}>
                  200 DMA {stock.dma200Value != null ? stock.dma200Value.toLocaleString("en-IN") : stock.above200DMA ? "✓" : "✗"}
                </span>
                {stock.industry && (
                  <span className="text-xs text-gray-400 font-mono">{stock.industry}</span>
                )}
              </div>
              {/* Returns vs benchmarks */}
              {(stock.stock6M != null || stock.nifty50_6M != null) && (() => {
                const fmt = (v: number | null) => v != null ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : "—";
                const cls = (s: number | null, b: number | null) =>
                  s == null ? "text-gray-400" : s >= (b ?? -Infinity) ? "text-emerald-600" : "text-red-600";
                return (
                  <div className="mt-2 border border-gray-200 rounded overflow-hidden">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="px-2 py-1 text-left text-gray-400 font-medium"></th>
                          <th className="px-2 py-1 text-right text-gray-400 font-medium">6M</th>
                          <th className="px-2 py-1 text-right text-gray-400 font-medium">1Y</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-gray-200">
                          <td className="px-2 py-1 text-gray-400 font-bold">{stock.stock}</td>
                          <td className={`px-2 py-1 text-right font-bold ${cls(stock.stock6M, stock.nifty50_6M)}`}>{fmt(stock.stock6M)}</td>
                          <td className={`px-2 py-1 text-right font-bold ${cls(stock.stock1Y, stock.nifty50_1Y)}`}>{fmt(stock.stock1Y)}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="px-2 py-1 text-gray-400">NIFTY 50</td>
                          <td className="px-2 py-1 text-right text-gray-400">{fmt(stock.nifty50_6M)}</td>
                          <td className="px-2 py-1 text-right text-gray-400">{fmt(stock.nifty50_1Y)}</td>
                        </tr>
                        <tr className="border-b border-gray-200">
                          <td className="px-2 py-1 text-gray-400">NIFTY 500</td>
                          <td className="px-2 py-1 text-right text-gray-400">{fmt(stock.nifty500_6M)}</td>
                          <td className="px-2 py-1 text-right text-gray-400">{fmt(stock.nifty500_1Y)}</td>
                        </tr>
                        <tr>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors text-xl px-2">✕</button>
          </div>
          <div className="flex gap-1 mt-3">
            <button
              onClick={() => setTab("summary")}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${tab === "summary" ? "bg-blue-50 text-blue-600 border border-blue-200" : "text-gray-400 hover:text-gray-700 border border-transparent"}`}
            >
              🤖 AI Summary
            </button>
            <button
              onClick={() => setTab("filings")}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${tab === "filings" ? "bg-blue-50 text-blue-600 border border-blue-200" : "text-gray-400 hover:text-gray-700 border border-transparent"}`}
            >
              🏛 Filings & News
              {sections.length > 0 && <span className="ml-1.5 text-gray-400">{sections.reduce((a, s) => a + s.items.length, 0)}</span>}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "summary" && (
            stock.aiSummary ? (
              <div>
                {stock.summaryDate && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs font-mono text-gray-400">AI analysis from {stock.summaryDate}</span>
                  </div>
                )}
                <AISummary text={stock.aiSummary} />
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">🤖</p>
                <p className="text-gray-400 font-mono text-sm">No AI summary yet</p>
                <p className="text-gray-400 font-mono text-xs mt-1">Run summaryAgent.js to generate</p>
              </div>
            )
          )}

          {tab === "filings" && (
            sections.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-gray-400 font-mono text-sm">No filings available</p>
              </div>
            ) : (
              <div className="space-y-5">
                {sections.map((section, si) => (
                  <div key={si}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-mono font-bold tracking-widest text-gray-400 uppercase">
                        {section.title === "BSE CORPORATE FILINGS" ? "🏛 BSE Filings" : "📰 " + section.title}
                      </span>
                      <div className="flex-1 h-px bg-gray-100" />
                      <span className="text-xs font-mono text-gray-400">{section.items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {section.items.map((item, ii) => (
                        <div key={ii} className="border border-gray-200 rounded-lg p-3 hover:border-gray-300 hover:bg-gray-50 transition-all">
                          {item.category && (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-blue-50 text-blue-600 border border-blue-200 mb-2">
                              {item.category}
                            </span>
                          )}
                          <p className="text-sm text-gray-800 leading-snug">{item.subject}</p>
                          <div className="flex items-center justify-between mt-2">
                            {item.date && <span className="text-xs text-gray-400 font-mono">{item.date}</span>}
                            {item.link && (
                              <a href={item.link} target="_blank" rel="noopener noreferrer"
                                className="text-xs font-mono px-2 py-1 rounded bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-600 border border-gray-300 hover:border-blue-200 transition-all">
                                {item.link.includes(".pdf") ? "📄 PDF" : "🔗 Link"}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div className="border-t border-gray-200 px-5 py-3 flex gap-3">
          <a href={`https://www.screener.in/company/${stock.ticker}/consolidated/`} target="_blank"
            className="flex-1 text-center py-2 rounded bg-gray-100 text-blue-600 text-xs font-mono hover:bg-blue-50 transition-all border border-gray-300">
            Screener.in ↗
          </a>
          <a href="https://www.bseindia.com/corporates/ann.html" target="_blank"
            className="flex-1 text-center py-2 rounded bg-gray-100 text-blue-600 text-xs font-mono hover:bg-blue-50 transition-all border border-gray-300">
            BSE Filings ↗
          </a>
        </div>
      </div>
    </>
  );
}

// Stock name colour based on PE deviation from Industry PE — tuned for light background
function stockNameColor(stockPE: number | null, industryPE: number | null): string {
  if (stockPE == null || industryPE == null || industryPE === 0) return "text-blue-600";
  const dev = (stockPE - industryPE) / industryPE * 100;
  if (dev <= -50) return "text-green-800";   // Dark Green: >50% cheaper
  if (dev <= -20) return "text-green-600";   // Green: 20-50% cheaper
  if (dev <    0) return "text-green-500";   // Light Green: 0-20% cheaper (was green-300, invisible on white)
  if (dev <=  20) return "text-pink-500";    // Pink: 0-20% more expensive (was pink-300)
  if (dev <=  50) return "text-red-500";     // Red: 20-50% more expensive
  return           "text-red-700";           // Dark Red: >50% more expensive
}

export default function HomeClient({ data }: { data: Stock[] }) {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [selectedReturns, setSelectedReturns] = useState<Stock | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const [livePrices, setLivePrices] = useState<Record<string, number>>({});
  const [liveStatus, setLiveStatus] = useState<"live" | "closed" | "error">("closed");
  const [flashMap, setFlashMap] = useState<Record<string, "up" | "down">>({});
  const prevPricesRef = useRef<Record<string, number>>({});

  // Live clock — updates every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Live price polling — every 30 seconds during market hours
  useEffect(() => {
    const tickers = data.map(s => s.ticker).filter(Boolean).join(",");
    if (!tickers) return;

    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/live-prices?tickers=${encodeURIComponent(tickers)}`);
        const json = await res.json();
        if (json.live && json.prices) {
          const newPrices: Record<string, number> = json.prices;
          const prev = prevPricesRef.current;

          // Compute which prices moved
          const newFlash: Record<string, "up" | "down"> = {};
          for (const [ticker, price] of Object.entries(newPrices)) {
            if (prev[ticker] != null && price !== prev[ticker]) {
              newFlash[ticker] = price > prev[ticker] ? "up" : "down";
            }
          }

          prevPricesRef.current = newPrices;
          setLivePrices(newPrices);
          setLiveStatus("live");

          if (Object.keys(newFlash).length > 0) {
            setFlashMap(newFlash);
            // Clear flash after 800ms
            setTimeout(() => setFlashMap({}), 800);
          }
        } else {
          setLiveStatus("closed");
        }
      } catch {
        setLiveStatus("error");
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30_000);
    return () => clearInterval(interval);
  }, [data]);

  const formatDateTime = (d: Date) =>
    d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) +
    "  " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  // Last updated = most recent summaryDate across all stocks
  const lastUpdated = data
    .map(s => s.summaryDate)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  // Group stocks by industry
  const grouped: Record<string, Stock[]> = {};
  data.forEach((stock) => {
    const key = stock.industry || "Other";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(stock);
  });

  // Sort groups by average PE deviation (cheapest sector first)
  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => {
    const avgA = a.reduce((sum, s) => sum + s.peDeviation, 0) / a.length;
    const avgB = b.reduce((sum, s) => sum + s.peDeviation, 0) / b.length;
    return avgA - avgB;
  });

  return (
    <>
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Valuation Heatmap</h1>
          <p className="text-sm text-gray-400 mt-1 font-mono">
            {data.length} stocks · grouped by sector · click stock for screener · 📊 for returns · 🤖 for AI summary
          </p>
        </div>
        <div className="text-right flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            {liveStatus === "live" && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse inline-block"></span>
                <span className="text-xs font-mono text-emerald-600 font-bold">LIVE</span>
              </span>
            )}
            {liveStatus === "closed" && (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-500/10 border border-gray-200">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block"></span>
                <span className="text-xs font-mono text-gray-400">MARKET CLOSED</span>
              </span>
            )}
            <span className="text-sm font-mono font-bold text-gray-700">{formatDateTime(now)}</span>
          </div>
          {lastUpdated && (
            <span className="text-xs font-mono text-gray-400">
              Last updated: <span className="text-gray-400">{lastUpdated}</span>
            </span>
          )}
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { label: "Cheap",    band: "cheap" },
          { label: "Discount", band: "discount" },
          { label: "Fair",     band: "fair" },
          { label: "Premium",  band: "premium" },
          { label: "Expensive",band: "expensive" },
        ].map((b) => {
          const count = data.filter((d) => d.band === b.band).length;
          if (count === 0) return null;
          return (
            <div key={b.band} className={`px-3 py-1.5 rounded text-xs font-mono ${bandStyles[b.band]}`}>
              {b.label} <span className="font-bold">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Industry PE footnote */}
      <div className="mb-4 px-3 py-2 rounded border border-gray-200 bg-gray-50 inline-flex items-center gap-2">
        <span className="text-gray-400 text-xs">ℹ</span>
        <span className="text-xs font-mono text-gray-400">
          Industry PE based on companies with mcap &gt; ₹5,000 Cr only
        </span>
      </div>

      {/* Grouped tables */}
      <div className="space-y-6">
        {sortedGroups.map(([industry, stocks]) => {
          // Get Industry PE High/Low from first stock in group that has it
          const peHighStock = stocks.find(s => s.industryPEHigh);
          const peLowStock  = stocks.find(s => s.industryPELow);

          const fmt = (v: number | null) => v != null ? `${v > 0 ? "+" : ""}${v.toFixed(1)}%` : "—";

          return (
            <div key={industry} className="rounded-lg border border-gray-200 overflow-hidden">

              {/* Sector header */}
              <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold tracking-widest text-gray-400 uppercase">
                    {industry}
                  </span>
                  <span className="text-xs font-mono text-gray-400">{stocks.length} stock{stocks.length > 1 ? "s" : ""}</span>
                </div>
                {/* Industry PE — hover to see high/low companies */}
                {(peHighStock || peLowStock) && (
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs font-mono text-gray-400">Industry PE:</span>
                    {peHighStock?.industryPE && (
                      <div className="relative group cursor-default">
                        <span className="text-xs font-mono text-gray-400 font-bold underline decoration-dotted decoration-gray-600 text-sm">
                          {peHighStock.industryPE}x
                        </span>
                        {/* Tooltip */}
                        <div className="absolute left-0 top-5 z-30 hidden group-hover:block w-56 bg-gray-50 border border-gray-300 rounded-lg shadow-xl px-3 py-2 pointer-events-none">
                          <div className="text-xs font-mono text-gray-400 mb-1.5 uppercase tracking-widest">PE Range</div>
                          {peLowStock?.industryPELow && (
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-mono text-emerald-600">↓ Low</span>
                              <span className="text-xs font-mono text-gray-700">{peLowStock.industryPELow}</span>
                            </div>
                          )}
                          {peHighStock?.industryPE && (
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-mono text-gray-400">Median</span>
                              <span className="text-xs font-mono text-gray-700 font-bold">{peHighStock.industryPE}x</span>
                            </div>
                          )}
                          {peHighStock?.industryPEHigh && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-red-600">↑ High</span>
                              <span className="text-xs font-mono text-gray-700">{peHighStock.industryPEHigh}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* ── MOBILE CARD VIEW (< md) ───────────────────────────── */}
              <div className="md:hidden divide-y divide-[#1e2a38]">
                {stocks.map((row, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                    {/* Row 1: Stock name + price + buttons */}
                    <div className="flex items-center justify-between mb-2">
                      <a
                        href={`https://www.screener.in/company/${row.ticker}/consolidated/`}
                        target="_blank"
                        className={`font-bold text-sm transition-colors hover:opacity-80 ${stockNameColor(row.stockPE, row.industryPE)}`}
                      >
                        {row.stock}
                      </a>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-gray-800">
                          {(() => {
                            const live = livePrices[row.ticker];
                            const price = live ?? row.currentPrice;
                            return price != null ? `₹${price.toLocaleString("en-IN")}` : "—";
                          })()}
                        </span>
                        <div className="flex gap-1">
                          {(row.stock6M != null || row.nifty50_6M != null) && (
                            <button onClick={() => setSelectedReturns(row)}
                              className="px-2 py-1 rounded text-xs font-mono bg-gray-100 text-gray-400 border border-gray-300 transition-all">
                              📊
                            </button>
                          )}
                          <button onClick={() => setSelectedStock(row)}
                            className="px-2 py-1 rounded text-xs font-mono bg-gray-100 text-gray-400 border border-gray-300 transition-all">
                            {row.aiSummary ? "🤖" : "📋"}
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* Row 2: 52W range + % from high + PE */}
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      {row.high52W != null && (
                        <span className="text-xs font-mono text-gray-400">
                          52W: <span className="text-gray-900">{row.high52W.toLocaleString("en-IN")}</span>
                          <span className="text-gray-400"> / </span>
                          <span className="text-gray-900">{row.low52W?.toLocaleString("en-IN") ?? "—"}</span>
                        </span>
                      )}
                      {row.pctFrom52WHigh != null && (
                        <span className="text-xs font-mono font-bold text-gray-900">
                          {row.pctFrom52WHigh.toFixed(1)}% from high
                        </span>
                      )}
                      {row.stockPE != null && (
                        <span className="text-xs font-mono text-gray-900 font-bold">PE {row.stockPE.toFixed(1)}x</span>
                      )}
                    </div>
                    {/* Row 3: DMA values + RSI */}
                    <div className="flex items-center gap-4 flex-wrap">
                      {row.dma50Value != null && (
                        <span className="text-xs font-mono font-bold text-gray-900">
                          50D {row.dma50Value.toLocaleString("en-IN")}
                        </span>
                      )}
                      {row.dma200Value != null && (
                        <span className="text-xs font-mono font-bold text-gray-900">
                          200D {row.dma200Value.toLocaleString("en-IN")}
                        </span>
                      )}
                      {row.rsi !== null && (
                        <span className="text-xs font-mono font-bold text-gray-900">
                          RSI {row.rsi}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ── DESKTOP TABLE VIEW (>= md) ───────────────────────── */}
              <div className="hidden md:block">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "14%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "8%" }} />
                  <col style={{ width: "10%" }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-gray-200">
                    <th colSpan={4} className="px-4 py-1"></th>
                    <th className="px-4 py-1"></th>
                    <th colSpan={2} className="px-4 py-1 text-center text-xs font-mono text-gray-400 font-medium tracking-widest">Moving Average</th>
                    <th colSpan={2} className="px-4 py-1"></th>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-mono text-gray-400 font-medium">Stock</th>
                    <th className="px-4 py-2 text-right text-xs font-mono text-gray-400 font-medium">Price</th>
                    <th className="px-4 py-2 text-right text-xs font-mono text-gray-400 font-medium">52W H / L</th>
                    <th className="px-4 py-2 text-right text-xs font-mono text-gray-400 font-medium">% from High</th>
                    <th className="px-4 py-2 text-right text-xs font-mono text-gray-400 font-medium">Stock PE</th>
                    <th className="px-4 py-2 text-center text-xs font-mono text-gray-400 font-medium">50D</th>
                    <th className="px-4 py-2 text-center text-xs font-mono text-gray-400 font-medium">200D</th>
                    <th className="px-4 py-2 text-left text-xs font-mono text-gray-400 font-medium">RSI %</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((row, i) => (
                    <tr key={i} className={`border-b border-gray-200 last:border-0 hover:bg-gray-50 transition-colors ${selectedStock?.stock === row.stock ? "bg-gray-50" : ""}`}>
                      <td className="px-4 py-3">
                        <a
                          href={`https://www.screener.in/company/${row.ticker}/consolidated/`}
                          target="_blank"
                          className={`font-medium transition-colors hover:opacity-80 ${stockNameColor(row.stockPE, row.industryPE)}`}
                        >
                          {row.stock}
                        </a>
                      </td>
                      {/* Current Price — live if available */}
                      <td className="px-4 py-3 text-right font-mono text-sm">
                        {(() => {
                          const live = livePrices[row.ticker];
                          const price = live ?? row.currentPrice;
                          const flash = flashMap[row.ticker];
                          return price != null ? (
                            <span className={`font-bold transition-colors duration-700 ${
                              flash === "up"   ? "text-emerald-600" :
                              flash === "down" ? "text-red-600" :
                              live != null     ? "text-gray-900" :
                                                 "text-gray-800"
                            }`}>
                              ₹{price.toLocaleString("en-IN")}
                            </span>
                          ) : <span className="text-gray-400">—</span>;
                        })()}
                      </td>
                      {/* 52W High / Low */}
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        {row.high52W != null ? (
                          <span>
                            <span className="text-gray-900">{row.high52W.toLocaleString("en-IN")}</span>
                            <span className="text-gray-400"> / </span>
                            <span className="text-gray-900">{row.low52W?.toLocaleString("en-IN") ?? "—"}</span>
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      {/* % from 52W High */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-sm">
                        {row.pctFrom52WHigh != null ? (
                          <span className="text-gray-900">
                            {row.pctFrom52WHigh.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      {/* Stock PE — no color, plain */}
                      <td className="px-4 py-3 text-right font-mono font-bold text-sm">
                        {row.stockPE != null ? (
                          <span className="text-gray-700">
                            {row.stockPE.toFixed(1)}x
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      {/* 50 DMA */}
                      <td className="px-4 py-3 text-center font-mono text-sm font-bold">
                        {row.dma50Value != null ? (
                          <span className="text-gray-900">
                            {row.dma50Value.toLocaleString("en-IN")}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      {/* 200 DMA */}
                      <td className="px-4 py-3 text-center font-mono text-sm font-bold">
                        {row.dma200Value != null ? (
                          <span className="text-gray-900">
                            {row.dma200Value.toLocaleString("en-IN")}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      {/* RSI */}
                      <td className="px-4 py-3">
                        {row.rsi !== null ? (
                          <span className="font-mono text-sm font-bold text-gray-900">
                            {row.rsi}%
                          </span>
                        ) : (
                          <span className="text-gray-400 font-mono text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {(row.stock6M != null || row.nifty50_6M != null) && (
                            <button
                              onClick={() => setSelectedReturns(row)}
                              className="px-2 py-1 rounded text-xs font-mono bg-gray-100 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 border border-gray-300 hover:border-emerald-200 transition-all"
                              title="Returns vs benchmarks"
                            >
                              📊
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedStock(row)}
                            className="px-2 py-1 rounded text-xs font-mono bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-600 border border-gray-300 hover:border-blue-200 transition-all"
                          >
                            {row.aiSummary ? "🤖" : "📋"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>{/* end desktop table */}
            </div>
          );
        })}
      </div>

      {selectedStock && (
        <SidePanel stock={selectedStock} onClose={() => setSelectedStock(null)} />
      )}
      {selectedReturns && (
        <ReturnsModal stock={selectedReturns} onClose={() => setSelectedReturns(null)} />
      )}
    </>
  );
}

"use client";

import { useState, useEffect } from "react";

type Stock = {
  stock: string;
  ticker: string;
  peDeviation: number;
  valuation: string;
  band: string;
  headlines: string | null;
  lastUpdate: string | null;
  aiSummary: string | null;
  summaryDate: string | null;
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

// Render inline bold: **text** → <strong>
function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

function AISummary({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Skip empty lines, --- dividers, raw markdown headers without emoji
        if (!trimmed || trimmed === "---" || trimmed === "—--") return null;
        if (/^#{1,3}\s/.test(trimmed) && !/^(📊|🏭|📰|✅)/.test(trimmed.replace(/^#{1,3}\s/, ""))) return null;

        // Strip leading ## from section headers
        const clean = trimmed.replace(/^#{1,3}\s*/, "");

        // Section headers with emoji
        if (/^(📊|🏭|📰|✅)/.test(clean)) {
          return (
            <div key={i} className="pt-4 first:pt-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold text-white">{clean}</span>
              </div>
            </div>
          );
        }

        // Date/title header lines (e.g. "ONGC — Daily Briefing", "10 March 2026")
        if (/Daily Briefing|^\*\*\d+/.test(clean)) return null;

        // Updated line
        if (clean.startsWith("_Updated:") || clean.startsWith("Updated:")) {
          return (
            <div key={i} className="text-xs text-gray-600 font-mono pt-3 mt-2 border-t border-[#1e2a38]">
              {clean.replace(/_/g, "")}
            </div>
          );
        }

        // Regular paragraph
        return (
          <p key={i} className="text-sm text-gray-300 leading-relaxed">
            {renderInline(clean)}
          </p>
        );
      })}
    </div>
  );
}

const bandStyles: Record<string, string> = {
  cheap: "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20",
  discount: "text-emerald-300 bg-emerald-300/10 border border-emerald-300/20",
  fair: "text-gray-400 bg-gray-400/10 border border-gray-400/20",
  premium: "text-amber-400 bg-amber-400/10 border border-amber-400/20",
  expensive: "text-red-400 bg-red-400/10 border border-red-400/20",
};

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

      <div className="fixed right-0 top-0 h-full w-[500px] bg-[#080b0f] border-l border-[#1e2a38] z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1e2a38] bg-[#0d1520]">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-lg">{stock.stock}</span>
                <span className="text-xs font-mono text-gray-500 bg-[#1e2a38] px-2 py-0.5 rounded">
                  {stock.ticker}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-mono ${bandStyles[stock.band]}`}>
                  {stock.valuation}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-sm font-mono font-bold ${stock.peDeviation < 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {stock.peDeviation > 0 ? "+" : ""}{stock.peDeviation.toFixed(1)}% PE deviation
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl px-2">
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3">
            <button
              onClick={() => setTab("summary")}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                tab === "summary"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-400/30"
                  : "text-gray-500 hover:text-gray-300 border border-transparent"
              }`}
            >
              🤖 AI Summary
            </button>
            <button
              onClick={() => setTab("filings")}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                tab === "filings"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-400/30"
                  : "text-gray-500 hover:text-gray-300 border border-transparent"
              }`}
            >
              🏛 Filings & News
              {sections.length > 0 && (
                <span className="ml-1.5 text-gray-600">{sections.reduce((a, s) => a + s.items.length, 0)}</span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* AI Summary tab */}
          {tab === "summary" && (
            stock.aiSummary ? (
              <div>
                {stock.summaryDate && (
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span className="text-xs font-mono text-gray-500">AI analysis from {stock.summaryDate}</span>
                  </div>
                )}
                <AISummary text={stock.aiSummary} />
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">🤖</p>
                <p className="text-gray-500 font-mono text-sm">No AI summary yet</p>
                <p className="text-gray-600 font-mono text-xs mt-1">Run summaryAgent.js to generate</p>
              </div>
            )
          )}

          {/* Filings tab */}
          {tab === "filings" && (
            sections.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-3xl mb-3">📭</p>
                <p className="text-gray-500 font-mono text-sm">No filings available</p>
                <p className="text-gray-600 font-mono text-xs mt-1">Run newsAgent.js to populate</p>
              </div>
            ) : (
              <div className="space-y-5">
                {sections.map((section, si) => (
                  <div key={si}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-mono font-bold tracking-widest text-gray-500 uppercase">
                        {section.title === "BSE CORPORATE FILINGS" ? "🏛 BSE Filings" : "📰 " + section.title}
                      </span>
                      <div className="flex-1 h-px bg-[#1e2a38]" />
                      <span className="text-xs font-mono text-gray-600">{section.items.length}</span>
                    </div>
                    <div className="space-y-2">
                      {section.items.map((item, ii) => (
                        <div key={ii} className="border border-[#1e2a38] rounded-lg p-3 hover:border-[#2e3f54] hover:bg-[#0d1520] transition-all">
                          {item.category && (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-mono bg-blue-400/10 text-blue-400 border border-blue-400/20 mb-2">
                              {item.category}
                            </span>
                          )}
                          <p className="text-sm text-gray-200 leading-snug">{item.subject}</p>
                          <div className="flex items-center justify-between mt-2">
                            {item.date && <span className="text-xs text-gray-500 font-mono">{item.date}</span>}
                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-mono px-2 py-1 rounded bg-[#1e2a38] text-gray-400 hover:bg-blue-500/20 hover:text-blue-400 border border-[#2e3f54] hover:border-blue-400/30 transition-all"
                              >
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

        {/* Footer */}
        <div className="border-t border-[#1e2a38] px-5 py-3 flex gap-3">
          <a
            href={`https://www.screener.in/company/${stock.ticker}/consolidated/`}
            target="_blank"
            className="flex-1 text-center py-2 rounded bg-[#1e2a38] text-blue-400 text-xs font-mono hover:bg-blue-500/20 transition-all border border-[#2e3f54]"
          >
            Screener.in ↗
          </a>
          <a
            href="https://www.bseindia.com/corporates/ann.html"
            target="_blank"
            className="flex-1 text-center py-2 rounded bg-[#1e2a38] text-blue-400 text-xs font-mono hover:bg-blue-500/20 transition-all border border-[#2e3f54]"
          >
            BSE Filings ↗
          </a>
        </div>
      </div>
    </>
  );
}

export default function HomeClient({ data }: { data: Stock[] }) {
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Valuation Heatmap</h1>
        <p className="text-sm text-gray-500 mt-1 font-mono">
          {data.length} stocks · PE deviation · click stock for screener · 📋 for AI summary & filings
        </p>
      </div>

      {/* Summary chips */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { label: "Cheap", band: "cheap" },
          { label: "Discount", band: "discount" },
          { label: "Fair", band: "fair" },
          { label: "Premium", band: "premium" },
          { label: "Expensive", band: "expensive" },
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

      {/* Table */}
      <div className="rounded-lg border border-[#1e2a38] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0d1520] border-b border-[#1e2a38]">
              {["Stock", "Ticker", "PE Deviation", "Valuation", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left text-xs font-mono text-gray-500 tracking-wider font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className={`border-b border-[#1e2a38] hover:bg-[#0d1520] transition-colors ${selectedStock?.stock === row.stock ? "bg-[#0d1520]" : ""}`}
              >
                <td className="px-4 py-3">
                  <a
                    href={`https://www.screener.in/company/${row.ticker}/consolidated/`}
                    target="_blank"
                    className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
                  >
                    {row.stock}
                  </a>
                </td>

                <td className="px-4 py-3 font-mono text-gray-500 text-xs">{row.ticker}</td>

                <td className="px-4 py-3 font-mono font-bold">
                  <span className={row.peDeviation < 0 ? "text-emerald-400" : "text-red-400"}>
                    {row.peDeviation > 0 ? "+" : ""}{row.peDeviation.toFixed(1)}%
                  </span>
                </td>

                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono ${bandStyles[row.band]}`}>
                    {row.valuation}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedStock(row)}
                    className="px-2 py-1 rounded text-xs font-mono bg-[#1e2a38] text-gray-400 hover:bg-blue-500/20 hover:text-blue-400 border border-[#2e3f54] hover:border-blue-400/30 transition-all"
                  >
                    {row.aiSummary ? "🤖 Summary" : "📋 Filings"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedStock && (
        <SidePanel stock={selectedStock} onClose={() => setSelectedStock(null)} />
      )}
    </>
  );
}

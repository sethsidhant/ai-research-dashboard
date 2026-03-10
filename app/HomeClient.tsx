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

const bandStyles: Record<string, string> = {
  cheap: "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20",
  discount: "text-emerald-300 bg-emerald-300/10 border border-emerald-300/20",
  fair: "text-gray-400 bg-gray-400/10 border border-gray-400/20",
  premium: "text-amber-400 bg-amber-400/10 border border-amber-400/20",
  expensive: "text-red-400 bg-red-400/10 border border-red-400/20",
};

function SidePanel({ stock, onClose }: { stock: Stock; onClose: () => void }) {
  const sections = stock.headlines ? parseHeadlines(stock.headlines) : [];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-[#080b0f] border-l border-[#1e2a38] z-50 flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e2a38] bg-[#0d1520]">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-lg">{stock.stock}</span>
              <span className="text-xs font-mono text-gray-500 bg-[#1e2a38] px-2 py-0.5 rounded">
                {stock.ticker}
              </span>
            </div>
            {stock.lastUpdate && (
              <p className="text-xs text-gray-500 font-mono mt-0.5">Updated {stock.lastUpdate}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl px-2">
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {sections.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 font-mono text-sm">No filings or news available</p>
              <p className="text-gray-700 font-mono text-xs mt-1">Run newsAgent.js to populate</p>
            </div>
          ) : (
            sections.map((section, si) => (
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
            ))
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
          {data.length} stocks · PE deviation · click stock for screener · 📋 for filings
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

      {/* Table — only 4 columns */}
      <div className="rounded-lg border border-[#1e2a38] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#0d1520] border-b border-[#1e2a38]">
              {["Stock", "Ticker", "PE Deviation", "Valuation", "Filings"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-mono text-gray-500 tracking-wider font-medium">
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
                    title="View filings & news"
                  >
                    📋
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

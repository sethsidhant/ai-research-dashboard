import Airtable from "airtable";
import HomeClient from "./HomeClient";

export const revalidate = 300;

async function getData() {
  const base = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY as string,
  }).base(process.env.AIRTABLE_BASE_ID as string);

  const coreRecords = await base("Core Universe")
    .select({
      fields: ["Stock", "Ticker", "Latest Headlines", "Last News Update", "AI Summary", "Summary Date", "Industry Hierarchy", "Industry PE", "Industry PE High", "Industry PE Low"]
    })
    .all();

  const stockMap: Record<string, any> = {};
  coreRecords.forEach((r: any) => {
    stockMap[r.id] = {
      name:           r.fields["Stock"],
      ticker:         (r.fields["Ticker"] as string)?.replace(".NS", "") ?? "",
      headlines:      r.fields["Latest Headlines"] ?? null,
      lastUpdate:     r.fields["Last News Update"] ?? null,
      aiSummary:      r.fields["AI Summary"] ?? null,
      summaryDate:    r.fields["Summary Date"] ?? null,
      industry:       r.fields["Industry Hierarchy"] ?? null,
      industryPE:     r.fields["Industry PE"] ?? null,
      industryPEHigh: r.fields["Industry PE High"] ?? null,
      industryPELow:  r.fields["Industry PE Low"] ?? null,
    };
  });

  const records = await base("Daily Scores")
    .select({ sort: [{ field: "Date", direction: "desc" }] })
    .all();

  const latestByStock: Record<string, any> = {};

  records.forEach((record: any) => {
    const fields = record.fields;
    const stockLink = fields["Stock Link"];
    const peDeviation = fields["PE Deviation %"];
    if (!stockLink?.length || peDeviation == null) return;

    const stockInfo = stockMap[stockLink[0]];
    if (!stockInfo) return;

    const stock = stockInfo.name;
    if (latestByStock[stock]) return;

    // Use Claude's PE Classification directly
    const classification = fields["Classification"] ?? null;
    let valuation = classification ?? "Fair";
    let band = "fair";
    if (classification === "Undervalued")   band = "cheap";
    else if (classification === "Fairly Valued") band = "fair";
    else if (classification === "Overvalued")    band = "expensive";
    else if (classification === "High Quality")  band = "premium";
    else if (classification === "Speculative")   band = "discount";
    // Fallback to PE deviation if no classification
    else if (peDeviation <= -20)      { valuation = "Cheap";          band = "cheap"; }
    else if (peDeviation <= -10)      { valuation = "Slight Discount"; band = "discount"; }
    else if (peDeviation >= 20)       { valuation = "Expensive";       band = "expensive"; }
    else if (peDeviation >= 10)       { valuation = "Slight Premium";  band = "premium"; }

    latestByStock[stock] = {
      stock,
      ticker:         stockInfo.ticker,
      peDeviation,
      valuation,
      band,
      industry:       stockInfo.industry,
      industryPE:     stockInfo.industryPE,
      industryPEHigh: stockInfo.industryPEHigh,
      industryPELow:  stockInfo.industryPELow,
      headlines:      stockInfo.headlines,
      lastUpdate:     stockInfo.lastUpdate,
      aiSummary:      stockInfo.aiSummary,
      summaryDate:    stockInfo.summaryDate,
      rsi:            fields["RSI"] ?? null,
      rsiSignal:      fields["RSI Signal"] ?? null,
      above50DMA:     fields["Above 50 DMA"] ?? false,
      above200DMA:    fields["Above 200 DMA"] ?? false,
      classification: fields["Classification"] ?? null,
      suggestedAction: fields["Suggested Action"] ?? null,
    };
  });

  return Object.values(latestByStock).sort(
    (a: any, b: any) => a.peDeviation - b.peDeviation
  );
}

export default async function Page() {
  const data = await getData();
  return <HomeClient data={data} />;
}

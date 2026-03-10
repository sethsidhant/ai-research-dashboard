import Airtable from "airtable";
import HomeClient from "./HomeClient";

export const revalidate = 3600;

async function getData() {
  const base = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY as string,
  }).base(process.env.AIRTABLE_BASE_ID as string);

  const coreRecords = await base("Core Universe")
    .select({ fields: ["Stock", "Ticker", "Latest Headlines", "Last News Update"] })
    .all();

  const stockMap: Record<string, any> = {};
  coreRecords.forEach((r: any) => {
    stockMap[r.id] = {
      name: r.fields["Stock"],
      ticker: r.fields["Ticker"]?.replace(".NS", "") ?? "",
      headlines: r.fields["Latest Headlines"] ?? null,
      lastUpdate: r.fields["Last News Update"] ?? null,
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

    let valuation = "Fair";
    let band = "fair";
    if (peDeviation <= -20) { valuation = "Cheap"; band = "cheap"; }
    else if (peDeviation <= -10) { valuation = "Slight Discount"; band = "discount"; }
    else if (peDeviation >= 20) { valuation = "Expensive"; band = "expensive"; }
    else if (peDeviation >= 10) { valuation = "Slight Premium"; band = "premium"; }

    latestByStock[stock] = {
      stock,
      ticker: stockInfo.ticker,
      peDeviation,
      valuation,
      band,
      headlines: stockInfo.headlines,
      lastUpdate: stockInfo.lastUpdate,
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

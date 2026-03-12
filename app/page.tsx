import { google } from "googleapis";
import HomeClient from "./HomeClient";

export const revalidate = 300;

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client as any });
}

async function getSheetData(sheetName: string) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: sheetName,
  });
  const rows = res.data.values || [];
  if (rows.length < 2) return [];
  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, any> = {};
    headers.forEach((h: string, j: number) => {
      let val: any = row[j] ?? null;
      if (val === "TRUE") val = true;
      else if (val === "FALSE") val = false;
      else if (val !== null && val !== "" && !isNaN(val)) val = Number(val);
      obj[h] = val;
    });
    return obj;
  });
}

function getValuationBand(peDeviation: number | null, classification: string | null): { valuation: string; band: string } {
  if (peDeviation === null) return { valuation: classification || "N/A", band: "fair" };
  if (peDeviation < -30)  return { valuation: "Cheap",     band: "cheap" };
  if (peDeviation < -10)  return { valuation: "Discount",  band: "discount" };
  if (peDeviation <= 10)  return { valuation: "Fair",      band: "fair" };
  if (peDeviation <= 30)  return { valuation: "Premium",   band: "premium" };
  return                         { valuation: "Expensive", band: "expensive" };
}

export default async function Home() {
  const [coreRows, scoreRows] = await Promise.all([
    getSheetData("Core Universe"),
    getSheetData("Daily Scores"),
  ]);

  const scoresMap: Record<string, any> = {};
  scoreRows.forEach((s) => { scoresMap[s["Stock"]] = s; });

  const stocks = coreRows.map((row) => {
    const scores = scoresMap[row["Stock"]] || {};
    const peDeviation = scores["PE Deviation %"] ?? null;
    const { valuation, band } = getValuationBand(peDeviation, scores["Classification"]);

    return {
      stock:          row["Stock"],
      ticker:         row["Ticker"],
      peDeviation:    peDeviation,
      valuation,
      band,
      industry:       row["Industry Hierarchy"] ?? null,
      industryPE:     row["Industry PE"] ?? null,
      industryPEHigh: row["Industry PE High"] ?? null,
      industryPELow:  row["Industry PE Low"] ?? null,
      headlines:      row["Latest Headlines"] ?? null,
      lastUpdate:     row["Last News Update"] ?? null,
      aiSummary:      row["AI Summary"] ?? null,
      summaryDate:    row["Summary Date"] ?? null,
      rsi:            scores["RSI"] ?? null,
      rsiSignal:      scores["RSI Signal"] ?? null,
      above50DMA:     scores["Above 50 DMA"] ?? false,
      above200DMA:    scores["Above 200 DMA"] ?? false,
      classification: scores["Classification"] ?? null,
      suggestedAction: scores["Suggested Action"] ?? null,
      sectorIndex:    null,   // removed
      stock6M:        scores["Stock 6M"] ?? null,
      stock1Y:        scores["Stock 1Y"] ?? null,
      nifty50_6M:     scores["Nifty50 6M"] ?? null,
      nifty50_1Y:     scores["Nifty50 1Y"] ?? null,
      nifty500_6M:    scores["Nifty500 6M"] ?? null,
      nifty500_1Y:    scores["Nifty500 1Y"] ?? null,
    };
  });

  return <HomeClient data={stocks} />;
}

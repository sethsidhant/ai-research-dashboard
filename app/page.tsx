import { google } from "googleapis";
import path from "path";
import HomeClient from "./HomeClient";

export const revalidate = 300;

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

async function getSheetsClient() {
  const creds = require(path.join(process.cwd(), "credentials.json"));
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
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

export default async function Home() {
  const [coreRows, scoreRows] = await Promise.all([
    getSheetData("Core Universe"),
    getSheetData("Daily Scores"),
  ]);

  // Build scores lookup by stock name
  const scoresMap: Record<string, any> = {};
  scoreRows.forEach((s) => { scoresMap[s["Stock"]] = s; });

  const stocks = coreRows.map((stock) => {
    const scores = scoresMap[stock["Stock"]] || {};
    return {
      name:             stock["Stock"],
      ticker:           stock["Ticker"],
      bseCode:          stock["BSE Code"],
      industryPE:       stock["Industry PE"],
      industryPEHigh:   stock["Industry PE High"],
      industryPELow:    stock["Industry PE Low"],
      stockPE:          stock["Stock PE"],
      roe:              stock["ROE %"],
      roce:             stock["ROCE %"],
      marketCap:        stock["Market Cap"],
      industry:         stock["Industry Hierarchy"],
      headlines:        stock["Latest Headlines"],
      lastNewsUpdate:   stock["Last News Update"],
      aiSummary:        stock["AI Summary"],
      summaryDate:      stock["Summary Date"],
      peDeviation:      scores["PE Deviation %"],
      rsi:              scores["RSI"],
      rsiSignal:        scores["RSI Signal"],
      above50DMA:       scores["Above 50 DMA"],
      above200DMA:      scores["Above 200 DMA"],
      compositeScore:   scores["Composite Score"],
      classification:   scores["Classification"],
      suggestedAction:  scores["Suggested Action"],
    };
  });

  return <HomeClient stocks={stocks} />;
}

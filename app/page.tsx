import Airtable from "airtable";

export default async function Home() {

  const base = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY as string,
  }).base(process.env.AIRTABLE_BASE_ID as string);

  const records = await base("Daily Scores").select().all();
  const coreRecords = await base("Core Universe").select().all();

  const stockMap: Record<string, string> = {};

  coreRecords.forEach((r: any) => {
    stockMap[r.id] = r.fields?.Stock;
  });

  const latestByStock: Record<string, any> = {};

  let macroRegime = "Unknown";

  records.forEach((record: any) => {
    const fields = record.fields;
    const stockLink = fields["Stock Link"];

    if (!stockLink) return;

    const stockId = Array.isArray(stockLink)
      ? stockLink[0]
      : stockLink;

    if (!stockId) return;

    // Compare dates to ensure latest record per stock
    const existing = latestByStock[stockId];

    if (!existing) {
      latestByStock[stockId] = fields;
    } else {
      const existingDate = new Date(existing["Date"]);
      const currentDate = new Date(fields["Date"]);

      if (currentDate > existingDate) {
        latestByStock[stockId] = fields;
      }
    }

    if (macroRegime === "Unknown" && fields["Macro Regime"]) {
      macroRegime = fields["Macro Regime"];
    }
  });

  const data = Object.entries(latestByStock)
    .sort((a: any, b: any) =>
      (b[1]["Composite Score"] || 0) -
      (a[1]["Composite Score"] || 0)
    );

  const macroColor =
    macroRegime === "Bullish"
      ? "text-green-400"
      : macroRegime === "Bearish"
      ? "text-red-400"
      : "text-yellow-400";

  return (
    <div className="p-10 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-2">
        AI Research Dashboard
      </h1>

      <div className={`text-xl font-semibold mb-8 ${macroColor}`}>
        Macro Regime: {macroRegime}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-700 text-sm">
          <thead>
            <tr className="bg-gray-800 text-center">
              <th className="p-3 border border-gray-700">Stock</th>
              <th className="p-3 border border-gray-700">Structural</th>
              <th className="p-3 border border-gray-700">Earnings</th>
              <th className="p-3 border border-gray-700">Technical</th>
              <th className="p-3 border border-gray-700">Risk</th>
              <th className="p-3 border border-gray-700">Stability</th>
              <th className="p-3 border border-gray-700 font-bold">Composite</th>
              <th className="p-3 border border-gray-700">Alloc %</th>
              <th className="p-3 border border-gray-700">RSI</th>
              <th className="p-3 border border-gray-700">&gt;200 DMA</th>
              <th className="p-3 border border-gray-700">Class</th>
              <th className="p-3 border border-gray-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map(([stockId, row]: any, idx: number) => (
              <tr key={idx} className="text-center hover:bg-gray-900">
                <td className="p-3 border border-gray-700 font-semibold">
                  {stockMap[stockId] || stockId}
                </td>
                <td className="p-3 border border-gray-700">{row["Structural Score"]}</td>
                <td className="p-3 border border-gray-700">{row["Earnings Score"]}</td>
                <td className="p-3 border border-gray-700">{row["Technical Score"]}</td>
                <td className="p-3 border border-gray-700">{row["Risk Score"]}</td>
                <td className="p-3 border border-gray-700">{row["Sector Score"]}</td>
                <td className="p-3 border border-gray-700 font-bold">{row["Composite Score"]}</td>
                <td className="p-3 border border-gray-700">
                  {(row["Suggested Allocation"] * 100).toFixed(1)}%
                </td>
                <td className="p-3 border border-gray-700">{row["RSI"]}</td>
                <td className="p-3 border border-gray-700">
                  {row["Above 200 DMA"] ? "Yes" : "No"}
                </td>
                <td className="p-3 border border-gray-700">{row["Classification"]}</td>
                <td className="p-3 border border-gray-700">{row["Suggested Action"]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
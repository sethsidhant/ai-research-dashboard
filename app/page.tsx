import Airtable from "airtable";

export default async function Home() {

  const base = new Airtable({
    apiKey: process.env.AIRTABLE_API_KEY!,
  }).base(process.env.AIRTABLE_BASE_ID!);

  // Fetch Daily Scores
  const records = await base("Daily Scores")
    .select({
      sort: [{ field: "Date", direction: "desc" }]
    })
    .all();

  // Fetch Core Universe (for stock name mapping)
  const coreRecords = await base("Core Universe").select().all();

  const stockMap: Record<string, string> = {};

  coreRecords.forEach((r: any) => {
    stockMap[r.id] = r.fields["Stock"];
  });

  const latestByStock: Record<string, any> = {};

  records.forEach((record: any) => {
    const stockLink = record.fields["Stock Link"] as string[] | undefined;

    if (!stockLink || stockLink.length === 0) return;

    const stockId = stockLink[0];

    if (!latestByStock[stockId]) {
      latestByStock[stockId] = record.fields;
    }
  });

  const data = Object.entries(latestByStock);

  return (
    <div className="p-10 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-8">
        AI Research Dashboard
      </h1>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-700 text-sm">
          <thead>
            <tr className="bg-gray-800 text-white text-center">
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
                <td className="p-3 border border-gray-700">
                  {row["Structural Score"]}
                </td>
                <td className="p-3 border border-gray-700">
                  {row["Earnings Score"]}
                </td>
                <td className="p-3 border border-gray-700">
                  {row["Technical Score"]}
                </td>
                <td className="p-3 border border-gray-700">
                  {row["Risk Score"]}
                </td>
                <td className="p-3 border border-gray-700">
                  {row["Sector Score"]}
                </td>
                <td className="p-3 border border-gray-700 font-bold">
                  {row["Composite Score"]}
                </td>
                <td className="p-3 border border-gray-700">
                  {(row["Suggested Allocation"] * 100).toFixed(1)}%
                </td>
                <td className="p-3 border border-gray-700">
                  {row["RSI"]}
                </td>
                <td className="p-3 border border-gray-700">
                  {row["Above 200 DMA"] ? "Yes" : "No"}
                </td>
                <td className="p-3 border border-gray-700">
                  {row["Classification"]}
                </td>
                <td className="p-3 border border-gray-700">
                  {row["Suggested Action"]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
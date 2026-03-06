import Airtable from "airtable";

export default async function Home() {

  const apiKey = process.env.AIRTABLE_API_KEY as string;
  const baseId = process.env.AIRTABLE_BASE_ID as string;

  const base = new Airtable({
    apiKey: apiKey
  }).base(baseId);

  const records = await base("Daily Scores")
    .select({
      sort: [{ field: "Date", direction: "desc" }]
    })
    .all();

  const latestByStock: any = {};

  records.forEach((record: any) => {

    const fields = record.fields;

    const stockLink = fields["Stock Link"];
    const peDeviation = fields["PE Deviation %"];

    if (!stockLink || stockLink.length === 0) return;

    const stock = stockLink[0];

    if (!latestByStock[stock]) {

      let valuation = "Fair";
      let color = "text-gray-300";

      if (peDeviation <= -20) {
        valuation = "Cheap";
        color = "text-green-400";
      }

      if (peDeviation >= 20) {
        valuation = "Expensive";
        color = "text-red-400";
      }

      latestByStock[stock] = {
        stock,
        peDeviation,
        valuation,
        color
      };
    }
  });

  const data = Object.values(latestByStock);

  return (
    <main className="p-10 bg-black min-h-screen text-white">

      <h1 className="text-3xl font-bold mb-8">
        AI Research Desk – Valuation Monitor
      </h1>

      <table className="border border-gray-700 w-full text-center">

        <thead className="bg-gray-900">
          <tr>
            <th className="p-3 border border-gray-700">Stock</th>
            <th className="p-3 border border-gray-700">PE Deviation</th>
            <th className="p-3 border border-gray-700">Valuation</th>
          </tr>
        </thead>

        <tbody>

          {data.map((row: any, i) => (

            <tr key={i} className="hover:bg-gray-800">

              <td className="p-3 border border-gray-700">

                <a
                  href={"https://www.screener.in/company/" + row.stock + "/"}
                  target="_blank"
                  style={{ color: "#60a5fa" }}
                >
                  {row.stock}
                </a>

              </td>

              <td className="p-3 border border-gray-700">
                {row.peDeviation ? row.peDeviation.toFixed(1) + "%" : "-"}
              </td>

              <td className={"p-3 border border-gray-700 font-semibold " + row.color}>
                {row.valuation}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </main>
  );
}
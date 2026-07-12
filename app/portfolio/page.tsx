import Link from "next/link";

export default function PortfolioPage() {
  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl p-8">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Portfolio
            </h1>

            <p className="mt-2 text-slate-500">
              Overview of your investments
            </p>
          </div>

          <button className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800">
            + Add Holding
          </button>
        </div>

        {/* KPI Cards */}

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Portfolio Value
            </p>

            <h2 className="mt-3 text-4xl font-bold">
              €80,500
            </h2>

            <p className="mt-2 text-green-600 font-semibold">
              +1.24% Today
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Return
            </p>

            <h2 className="mt-3 text-4xl font-bold text-green-600">
              +18.4%
            </h2>

            <p className="mt-2 text-slate-500">
              Since inception
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Holdings
            </p>

            <h2 className="mt-3 text-4xl font-bold">
              6
            </h2>

            <p className="mt-2 text-slate-500">
              Diversified portfolio
            </p>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">
              Risk Profile
            </p>

            <h2 className="mt-3 text-4xl font-bold">
              Growth
            </h2>

            <p className="mt-2 text-blue-600 font-semibold">
              Aggressive
            </p>
          </div>

        </div>

        {/* Charts */}

        <div className="mt-8 grid gap-6 lg:grid-cols-2">

          <div className="rounded-3xl bg-white p-8 shadow-sm">

            <h2 className="text-xl font-bold">
              Portfolio Performance
            </h2>

            <div className="mt-8 flex h-72 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300">

              <p className="text-slate-400">
                Performance chart coming soon
              </p>

            </div>

          </div>

          <div className="rounded-3xl bg-white p-8 shadow-sm">

            <h2 className="text-xl font-bold">
              Asset Allocation
            </h2>

            <div className="mt-8 space-y-5">

              <Allocation
                name="Bitcoin"
                percentage={67}
              />

              <Allocation
                name="Uranium"
                percentage={9}
              />

              <Allocation
                name="AI Infrastructure"
                percentage={8}
              />

              <Allocation
                name="Global Equities"
                percentage={10}
              />

              <Allocation
                name="Gold"
                percentage={6}
              />

            </div>

          </div>

        </div>

        {/* Holdings */}

        <div className="mt-8 rounded-3xl bg-white p-8 shadow-sm">

          <h2 className="mb-6 text-2xl font-bold">
            Holdings
          </h2>

          <table className="w-full">

            <thead>

              <tr className="border-b text-left text-slate-500">

                <th className="pb-4">
                  Holding
                </th>

                <th>
                  Weight
                </th>

                <th>
                  Value
                </th>

                <th>
                  Return
                </th>

              </tr>

            </thead>

            <tbody>

              <HoldingRow
                ticker="IB1T"
                href="/holding/ib1t"
                weight="67%"
                value="€58,100"
                change="+18%"
                positive
              />

              <HoldingRow
                ticker="NUKL"
                href="/holding/nukl"
                weight="9%"
                value="€7,500"
                change="-12%"
              />

              <HoldingRow
                ticker="VWCE"
                href="/holding/vwce"
                weight="10%"
                value="€8,900"
                change="+6%"
                positive
              />

              <HoldingRow
                ticker="AIFS"
                href="/holding/aifs"
                weight="8%"
                value="€5,300"
                change="+2%"
                positive
              />

            </tbody>

          </table>

        </div>

      </div>
    </main>
  );
}

function Allocation({
  name,
  percentage,
}: {
  name: string;
  percentage: number;
}) {
  return (
    <div>

      <div className="mb-2 flex justify-between">

        <span>{name}</span>

        <span className="font-semibold">
          {percentage}%
        </span>

      </div>

      <div className="h-3 rounded-full bg-slate-200">

        <div
          className="h-3 rounded-full bg-slate-900"
          style={{
            width: `${percentage}%`,
          }}
        />

      </div>

    </div>
  );
}

function HoldingRow({
  ticker,
  href,
  weight,
  value,
  change,
  positive = false,
}: {
  ticker: string;
  href: string;
  weight: string;
  value: string;
  change: string;
  positive?: boolean;
}) {
  return (
    <tr className="border-b hover:bg-slate-50">

      <td className="py-5">

        <Link
          href={href}
          className="font-semibold text-blue-600 hover:underline"
        >
          {ticker}
        </Link>

      </td>

      <td>{weight}</td>

      <td>{value}</td>

      <td
        className={
          positive
            ? "font-semibold text-green-600"
            : "font-semibold text-red-600"
        }
      >
        {change}
      </td>

    </tr>
  );
}
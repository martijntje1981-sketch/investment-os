
import Link from "next/link";

export default function PortfolioPage() {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <h1 className="text-3xl font-bold text-slate-900">Portfolio</h1>
  
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">Portfolio Value</p>
            <h2 className="mt-2 text-3xl font-bold">€0</h2>
          </div>
  
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">Today's Return</p>
            <h2 className="mt-2 text-3xl font-bold text-green-600">+0.00%</h2>
          </div>
  
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">Total Return</p>
            <h2 className="mt-2 text-3xl font-bold">+0.00%</h2>
          </div>
  
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">Holdings</p>
            <h2 className="mt-2 text-3xl font-bold">6</h2>
          </div>
        </div>
  
        <div className="mt-8 rounded-2xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Holdings</h2>
  
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left">Ticker</th>
                <th>Weight</th>
                <th>Value</th>
                <th>Return</th>
              </tr>
            </thead>
  
            <tbody>
              <tr className="border-b h-14">
              <td>
  <Link
    href="/holding/ib1t"
    className="font-semibold text-blue-600 hover:underline"
  >
    IB1T
  </Link>
</td>
                <td>67%</td>
                <td>€58,100</td>
                <td className="text-green-600">+18%</td>
              </tr>
  
              <tr className="border-b h-14">
                <td>NUKL</td>
                <td>9%</td>
                <td>€7,500</td>
                <td className="text-red-600">-12%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    );
  }
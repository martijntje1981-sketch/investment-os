import Link from "next/link";
import { ArrowRight, Coins, Layers3, ListChecks, Mail } from "lucide-react";

import { BackButton } from "@/components/layout/BackButton";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import { SupportStatusBadge } from "@/components/marketing/SupportStatusBadge";
import {
  cryptoSectionCopy,
  getSupportedCryptoDisplayRows,
  INSTRUMENT_SUPPORT_STATUSES,
  stocksEtfsSectionCopy,
  supportedInstrumentsCta,
  supportedInstrumentsHero,
  SUPPORTED_INSTRUMENTS_PATH,
} from "@/lib/content/supportedInstrumentsContent";

export default function SupportedInstrumentsPage() {
  const cryptoRows = getSupportedCryptoDisplayRows();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MarketingHeader />

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-white">
          <div className="absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-gradient-to-br from-blue-200/40 via-violet-200/30 to-transparent blur-3xl" />

          <div className="relative mx-auto max-w-4xl px-5 pb-20 pt-8 text-center sm:px-8 sm:pb-24 sm:pt-10">
            <div className="mb-6 flex justify-start">
              <BackButton variant="light" />
            </div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-xl">
              <ListChecks className="h-7 w-7" />
            </div>

            <h1 className="mt-7 text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">
              {supportedInstrumentsHero.title}
            </h1>

            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              {supportedInstrumentsHero.subtitle}
            </p>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionIntro
              icon={Coins}
              title="Crypto"
              description={cryptoSectionCopy.intro}
            />

            <div className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="hidden md:block">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                        Asset
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                        Symbol
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                        Live pricing
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                        Pricing route
                      </th>
                      <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cryptoRows.map((row) => (
                      <tr key={row.symbol}>
                        <td className="px-5 py-4 text-sm font-bold text-slate-900">
                          {row.name}
                        </td>
                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {row.symbol}
                        </td>
                        <td className="px-5 py-4">
                          <SupportStatusBadge status="supported" />
                        </td>
                        <td className="px-5 py-4 text-sm leading-6 text-slate-600">
                          {row.pricingRoute}
                        </td>
                        <td className="px-5 py-4 text-sm leading-6 text-slate-500">
                          {row.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-100 md:hidden">
                {cryptoRows.map((row) => (
                  <article key={row.symbol} className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-black text-slate-950">{row.name}</h3>
                        <p className="mt-1 text-sm font-semibold text-slate-600">{row.symbol}</p>
                      </div>
                      <SupportStatusBadge status="supported" />
                    </div>
                    <p className="text-sm leading-6 text-slate-600">
                      <span className="font-bold text-slate-800">Pricing route:</span>{" "}
                      {row.pricingRoute}
                    </p>
                    <p className="text-sm leading-6 text-slate-500">{row.notes}</p>
                  </article>
                ))}
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-600">{cryptoSectionCopy.footnote}</p>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionIntro
              icon={Layers3}
              title={stocksEtfsSectionCopy.title}
              description={stocksEtfsSectionCopy.paragraphs[0]!}
            />

            <div className="mt-8 space-y-4 rounded-[28px] border border-slate-200 bg-slate-50 p-6 sm:p-8">
              {stocksEtfsSectionCopy.paragraphs.slice(1).map((paragraph) => (
                <p key={paragraph} className="text-sm leading-7 text-slate-600">
                  {paragraph}
                </p>
              ))}

              <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
                {stocksEtfsSectionCopy.notice}
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <SectionIntro
              icon={ListChecks}
              title="Support statuses"
              description="Tobailey uses clear labels so you can see whether live pricing is available, pending review, or temporarily unavailable."
            />

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {INSTRUMENT_SUPPORT_STATUSES.map((status) => (
                <article
                  key={status.id}
                  className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <SupportStatusBadge status={status.id} />
                  <p className="mt-3 text-sm leading-7 text-slate-600">{status.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-200 bg-slate-950 px-5 py-16 text-white sm:px-8 sm:py-20">
          <div className="mx-auto flex max-w-4xl flex-col items-start gap-5 rounded-[28px] border border-white/10 bg-white/5 p-8 sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <Mail className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black tracking-[-0.03em]">
              {supportedInstrumentsCta.title}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">
              {supportedInstrumentsCta.body}
            </p>
            <Link
              href={supportedInstrumentsCta.contactPath}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
            >
              {supportedInstrumentsCta.buttonLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <p className="text-xs leading-5 text-slate-500">
            Live pricing depends on market-data availability and the selected trading pair.
          </p>
          <nav className="flex flex-wrap gap-5 text-xs font-bold text-slate-600">
            <Link href="/">Home</Link>
            <Link href="/faq">FAQ</Link>
            <Link href={SUPPORTED_INSTRUMENTS_PATH}>Supported instruments</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function SectionIntro({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Coins;
  title: string;
  description: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-blue-700">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950">{title}</h2>
      <p className="mt-3 text-base leading-8 text-slate-600">{description}</p>
    </div>
  );
}

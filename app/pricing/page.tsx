import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BackButton } from "@/components/layout/BackButton";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import {
  pricingAvailabilityNote,
  SUPPORTED_INSTRUMENTS_PATH,
} from "@/lib/content/supportedInstrumentsContent";

const benefits = [
  "Live portfolio monitoring",
  "Daily and weekly portfolio pulse",
  "Personalised market briefing",
  "Goal tracking and planning",
  "Portfolio Scorecard",
  "Holdings, news and perspectives",
];

/**
 * Dedicated pricing destination for Example Portfolio conversion CTA.
 * Authenticated users can open this page (unlike `/#pricing`, which never
 * renders because `/` redirects signed-in users to `/dashboard`).
 */
export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MarketingHeader />

      <main>
        <section
          id="pricing"
          className="scroll-mt-24 border-b border-slate-200 bg-slate-50 px-5 py-16 sm:px-8 sm:py-24"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mb-8">
              <BackButton variant="light" />
            </div>

            <p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-700">
              Simple pricing
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">
              One plan. Complete clarity with Tobailey.
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              Keep your Example Portfolio and continue with full access. Stripe
              checkout is not automated yet — use the options below to continue.
            </p>

            <div className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl">
              <div className="bg-slate-950 p-8 text-white sm:p-10">
                <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-violet-300">
                      Complete access
                    </p>
                    <h2 className="mt-3 text-3xl font-black">Tobailey</h2>
                    <p className="mt-3 max-w-lg leading-7 text-slate-300">
                      Portfolio monitoring, personalised analysis and goal
                      tracking in one clear platform.
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-4xl font-black">€5.99</p>
                    <p className="mt-1 text-sm text-slate-400">per month</p>
                  </div>
                </div>
              </div>

              <div className="p-8 sm:p-10">
                <ul className="grid gap-3 sm:grid-cols-2">
                  {benefits.map((benefit) => (
                    <li
                      key={benefit}
                      className="flex items-start gap-2 text-sm font-medium text-slate-700"
                    >
                      <span
                        className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                        aria-hidden
                      />
                      {benefit}
                    </li>
                  ))}
                </ul>

                <p className="mt-6 text-sm leading-6 text-slate-600">
                  {pricingAvailabilityNote.text}{" "}
                  <Link
                    href={SUPPORTED_INSTRUMENTS_PATH}
                    className="font-bold text-blue-700 hover:text-blue-800"
                  >
                    {pricingAvailabilityNote.linkLabel}
                  </Link>
                </p>

                <Link
                  href="/contact"
                  className="mt-9 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-4 text-sm font-bold text-brand-navy transition hover:bg-brand-hover"
                >
                  Contact us to keep your portfolio
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                  €5.99 per month after your example period. Cancel anytime.
                  Automatic checkout is coming soon.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

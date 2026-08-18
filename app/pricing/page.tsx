import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BackButton } from "@/components/layout/BackButton";
import MarketingHeader from "@/components/marketing/MarketingHeader";
import {
  PRODUCT_MODELS,
  PRODUCT_POSITIONING,
} from "@/lib/content/productModels";
import {
  pricingAvailabilityNote,
  SUPPORTED_INSTRUMENTS_PATH,
} from "@/lib/content/supportedInstrumentsContent";

/**
 * Dedicated pricing destination for trial conversion CTA.
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
              {PRODUCT_POSITIONING.eyebrow}
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">
              {PRODUCT_POSITIONING.title}
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              {PRODUCT_POSITIONING.description} Stripe checkout is not automated
              yet — use the options below to continue.
            </p>

            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              {PRODUCT_MODELS.map((model) => (
                <article
                  key={model.id}
                  className={`flex flex-col overflow-hidden rounded-[32px] border shadow-xl ${
                    model.featured
                      ? "border-slate-900 bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-950"
                  }`}
                >
                  <div className="p-8 sm:p-10">
                    <p
                      className={`text-sm font-bold uppercase tracking-[0.16em] ${
                        model.featured ? "text-violet-300" : "text-slate-500"
                      }`}
                    >
                      {model.shortName}
                    </p>
                    <h2 className="mt-3 text-3xl font-black">
                      {model.publicName}
                    </h2>
                    <div className="mt-4 flex items-end gap-2">
                      <p className="text-4xl font-black">{model.priceLabel}</p>
                      <p
                        className={`pb-1 text-sm ${
                          model.featured ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        {model.priceSuffix}
                      </p>
                    </div>
                    <p
                      className={`mt-4 leading-7 ${
                        model.featured ? "text-slate-300" : "text-slate-600"
                      }`}
                    >
                      {model.shortDescription}
                    </p>
                    <ul className="mt-6 space-y-2.5">
                      {model.highlights.map((item) => (
                        <li
                          key={item}
                          className={`flex items-start gap-2 text-sm font-medium ${
                            model.featured ? "text-slate-200" : "text-slate-700"
                          }`}
                        >
                          <span
                            className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                              model.featured ? "bg-brand" : "bg-slate-900"
                            }`}
                            aria-hidden
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                    <Link
                      href={model.ctaHref}
                      className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold transition ${
                        model.featured
                          ? "bg-brand text-brand-navy hover:bg-brand-hover"
                          : "bg-slate-950 text-white hover:bg-slate-800"
                      }`}
                    >
                      {model.ctaLabel}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    {model.id === "complete" ? (
                      <Link
                        href="/contact"
                        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                      >
                        Contact us to keep your portfolio
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>

            <p className="mt-8 text-sm leading-6 text-slate-600">
              {pricingAvailabilityNote.text}{" "}
              <Link
                href={SUPPORTED_INSTRUMENTS_PATH}
                className="font-bold text-blue-700 hover:text-blue-800"
              >
                {pricingAvailabilityNote.linkLabel}
              </Link>
            </p>
            <p className="mt-3 text-center text-xs leading-5 text-slate-500 sm:text-left">
              After your trial: Complete for €5.99/month, or Tobailey Free.
              Cancel anytime. Automatic checkout is coming soon.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}

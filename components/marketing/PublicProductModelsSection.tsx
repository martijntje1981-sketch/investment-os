import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { PRODUCT_MODELS } from "@/lib/content/productModels";

/**
 * Public Invest / Crypto / Complete positioning.
 * Same Four Questions for all three — not three separate apps.
 */
export function PublicProductModelsSection() {
  return (
    <section
      id="products"
      className="scroll-mt-24 border-b border-slate-200 bg-white px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
            Choose how you invest
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">
            Three ways to use Tobailey
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            All three use the same four questions. Pick the portfolio world that
            matches what you own.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {PRODUCT_MODELS.map((model) => (
            <article
              key={model.id}
              className="flex flex-col rounded-[28px] border border-slate-200 bg-slate-50/60 p-7 shadow-sm"
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                {model.shortName}
              </p>
              <h3 className="mt-3 text-2xl font-black tracking-[-0.03em] text-slate-950">
                {model.publicName}
              </h3>
              <p className="mt-3 text-base font-semibold leading-7 text-slate-800">
                {model.headline}
              </p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {model.shortDescription}
              </p>
              <ul className="mt-6 space-y-2.5">
                {model.highlights.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-sm font-medium leading-6 text-slate-700"
                  >
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={model.ctaHref}
                className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 text-sm font-bold text-brand-navy transition hover:bg-brand-hover"
              >
                {model.ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-6 text-slate-500">
          Product choice is positioning for now. Your personal trial starts with
          an empty portfolio — Demo remains a separate read-only explore path.
        </p>
      </div>
    </section>
  );
}

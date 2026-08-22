import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  PRODUCT_MODELS,
  PRODUCT_POSITIONING,
} from "@/lib/content/productModels";

/**
 * Public Free vs Complete positioning.
 * Trial starts with Complete; after 14 days users keep Complete or Free.
 */
export function PublicProductModelsSection() {
  return (
    <section
      id="plans"
      className="scroll-mt-24 border-b border-slate-200 bg-white px-5 py-20 sm:px-8 sm:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
            {PRODUCT_POSITIONING.eyebrow}
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] text-slate-950 sm:text-5xl">
            {PRODUCT_POSITIONING.title}
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            {PRODUCT_POSITIONING.description}
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          {PRODUCT_MODELS.map((model) => (
            <article
              key={model.id}
              className={`flex flex-col rounded-[28px] border p-7 shadow-sm ${
                model.featured
                  ? "border-brand-navy bg-gradient-to-br from-brand-navy via-brand-deep to-q4-deep text-white"
                  : "border-slate-200 bg-slate-50/60 text-slate-950"
              }`}
            >
              <p
                className={`text-xs font-black uppercase tracking-[0.16em] ${
                  model.featured ? "text-brand" : "text-slate-600"
                }`}
              >
                {model.shortName}
              </p>
              <h3 className="mt-3 text-2xl font-black tracking-[-0.03em]">
                {model.publicName}
              </h3>
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
              <p className="mt-4 text-base font-semibold leading-7">
                {model.headline}
              </p>
              <p
                className={`mt-3 text-sm leading-7 ${
                  model.featured ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {model.shortDescription}
              </p>
              <ul className="mt-6 space-y-2.5">
                {model.highlights.map((item) => (
                  <li
                    key={item}
                    className={`flex gap-2 text-sm font-medium leading-6 ${
                      model.featured ? "text-slate-200" : "text-slate-700"
                    }`}
                  >
                    <span
                      className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
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
                className={`mt-8 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-bold transition ${
                  model.featured
                    ? "bg-brand text-brand-navy hover:bg-brand-hover"
                    : "bg-navy-hero text-white hover:bg-navy-card"
                }`}
              >
                {model.ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </article>
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-sm leading-6 text-slate-500">
          New eligible accounts start with 14 days of Complete. After that,
          choose Complete or continue with Tobailey Free. Personal Complete
          starts with an empty portfolio — Demo remains a separate read-only
          explore path.
        </p>
      </div>
    </section>
  );
}

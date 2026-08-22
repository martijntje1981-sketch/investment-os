"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";

import {
  appCardClass,
  appCardPaddingClass,
  appSectionBodyClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  HELP_CENTRE_SECTIONS,
  searchHelpCentre,
  type HelpCentreSection,
} from "@/lib/content/helpCentre";

export function HelpCentreClient() {
  const [query, setQuery] = useState("");
  const sections = useMemo(
    () => (query.trim() ? searchHelpCentre(query) : HELP_CENTRE_SECTIONS),
    [query],
  );

  return (
    <>
      <div className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-3 sm:px-6">
          <label className="relative block">
            <span className="sr-only">Search Help Centre</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search — advice, Scorecard, export, review email…"
              className="min-h-[48px] w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-[15px] text-slate-900 outline-none ring-brand focus:border-brand focus:bg-white focus:ring-2"
              data-testid="help-centre-search"
            />
          </label>
        </div>
      </div>

      <nav
        aria-label="Help Centre sections"
        className="border-b border-slate-200/80 bg-white"
      >
        <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto overscroll-x-contain px-4 py-3 sm:px-6">
          {(query.trim() ? sections : HELP_CENTRE_SECTIONS).map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex min-h-[44px] shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-3.5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {section.title}
            </a>
          ))}
        </div>
      </nav>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-3xl space-y-10">
          {sections.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-[15px] text-slate-600">
              No matching answers. Try “Portfolio Scorecard”, “review email”,
              “export” or “financial advice”.
            </p>
          ) : (
            sections.map((section) => (
              <HelpSection key={section.id} section={section} />
            ))
          )}
        </div>
      </section>
    </>
  );
}

function HelpSection({ section }: { section: HelpCentreSection }) {
  return (
    <section
      id={section.id}
      className="scroll-mt-24"
      aria-labelledby={`${section.id}-heading`}
    >
      <h2 id={`${section.id}-heading`} className={appSectionTitleClass}>
        {section.title}
      </h2>
      <div className="mt-4 space-y-3">
        {section.questions.map((item) => (
          <details
            key={`${section.id}-${item.question}`}
            className={`group ${appCardClass} ${appCardPaddingClass} transition open:shadow-[0_8px_24px_-16px_rgba(15,45,80,0.2)] motion-reduce:transition-none`}
          >
            <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
              <span className="min-w-0">{item.question}</span>
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-600 transition group-open:rotate-45 group-open:bg-navy-hero group-open:text-white motion-reduce:transition-none"
                aria-hidden
              >
                +
              </span>
            </summary>
            <div
              className={`mt-4 border-t border-slate-100 pt-4 ${appSectionBodyClass}`}
            >
              <p>{item.answer}</p>
              {item.link ? (
                <Link
                  href={item.link.href}
                  className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-brand-navy underline-offset-2 hover:underline"
                >
                  {item.link.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : null}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { TobaileyLogo } from "@/components/brand/TobaileyLogo";
import {
  appCardClass,
  appCardPaddingClass,
  appSectionBodyClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appSolidButtonClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { HELP_CENTRE_SECTIONS } from "@/lib/content/helpCentre";
import { SUPPORTED_INSTRUMENTS_PATH } from "@/lib/content/supportedInstrumentsContent";

export default function FAQPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-background text-foreground">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex min-h-[44px] items-center">
            <TobaileyLogo size={40} showWordmark showTagline />
          </Link>

          <Link
            href="/"
            className={`inline-flex ${appTextLinkClass} text-slate-600`}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back home
          </Link>
        </div>
      </header>

      <section className="border-b border-slate-200/80 bg-navy-hero text-white">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
            <CircleHelp className="h-6 w-6" aria-hidden />
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
            Help Centre
          </p>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-[-0.03em] sm:text-[2rem]">
            Answers, calmly organised
          </h1>
          <p className="mt-3 max-w-xl text-[15px] font-medium leading-relaxed text-white/70">
            Getting started, holdings, goals, history, prices and more — short
            answers without the noise.
          </p>
        </div>
      </section>

      <nav
        aria-label="Help Centre sections"
        className="border-b border-slate-200/80 bg-white"
      >
        <div className="mx-auto flex max-w-3xl gap-2 overflow-x-auto overscroll-x-contain px-4 py-3 sm:px-6">
          {HELP_CENTRE_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="inline-flex min-h-[40px] shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-3.5 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            >
              {section.title}
            </a>
          ))}
        </div>
      </nav>

      <section className="px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-3xl space-y-10">
          {HELP_CENTRE_SECTIONS.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-24"
              aria-labelledby={`${section.id}-heading`}
            >
              <h2
                id={`${section.id}-heading`}
                className={appSectionTitleClass}
              >
                {section.title}
              </h2>

              <div className="mt-4 space-y-3">
                {section.questions.map((item) => (
                  <details
                    key={item.question}
                    className={`group ${appCardClass} ${appCardPaddingClass} transition open:shadow-[0_8px_24px_-16px_rgba(15,45,80,0.2)] motion-reduce:transition-none`}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2">
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
                          className={`mt-3 ${appTextLinkClass}`}
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
          ))}
        </div>
      </section>

      <section className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          <article
            className={`${appCardClass} ${appCardPaddingClass} bg-navy-hero text-white`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <ShieldCheck className="h-5 w-5" aria-hidden />
            </div>
            <h2 className="mt-4 text-lg font-bold tracking-[-0.02em]">
              Important information
            </h2>
            <p className="mt-2 text-[14px] font-medium leading-relaxed text-white/70">
              Tobailey helps you monitor and understand your portfolio. It is
              not personal financial advice and cannot guarantee results.
            </p>
          </article>

          <article className={`${appCardClass} ${appCardPaddingClass}`}>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-soft text-brand-navy">
              <Mail className="h-5 w-5" aria-hidden />
            </div>
            <h2 className={`mt-4 ${appSectionTitleClass}`}>Still stuck?</h2>
            <p className={`mt-2 ${appSectionMetaClass}`}>
              Account access, feedback or partnerships — the team can help.
            </p>
            <Link href="/contact" className={`mt-4 ${appSolidButtonClass}`}>
              Contact us
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </article>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <p className="text-xs leading-5 text-slate-500">
            © {new Date().getFullYear()} Tobailey. All rights reserved.
          </p>
          <nav className="flex flex-wrap gap-4 text-xs font-semibold text-slate-600">
            <Link href={SUPPORTED_INSTRUMENTS_PATH}>Supported instruments</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

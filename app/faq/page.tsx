import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { TobaileyLogo } from "@/components/brand/TobaileyLogo";
import { HelpCentreClient } from "@/components/help/HelpCentreClient";
import {
  appCardClass,
  appCardPaddingClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appSolidButtonClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { TRUST_NOT_ADVICE_SHORT } from "@/lib/content/productTrust";
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
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-brand/40">
            <CircleHelp className="h-6 w-6 text-brand" aria-hidden />
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
            Help Centre
          </p>
          <h1 className="mt-2 text-[1.75rem] font-bold tracking-[-0.03em] sm:text-[2rem]">
            Answers, calmly organised
          </h1>
          <p className="mt-3 max-w-xl text-[15px] font-medium leading-relaxed text-white/70">
            Getting started, reviews, Scorecard, export, market data and trust —
            short answers without the noise.
          </p>
          <p className="mt-3 text-[13px] font-medium text-white/55">
            {TRUST_NOT_ADVICE_SHORT}
          </p>
        </div>
      </section>

      <HelpCentreClient />

      <section className="px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2">
          <article
            id="disclaimers-spotlight"
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
            <a
              href="#disclaimers"
              className="mt-3 inline-flex min-h-[44px] items-center text-sm font-semibold text-brand underline-offset-2 hover:underline"
            >
              Read full disclaimers
            </a>
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

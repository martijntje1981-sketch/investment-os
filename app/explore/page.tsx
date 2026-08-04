"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";

import { TrialStepsCard } from "@/components/example/TrialStepsCard";
import BottomNavigation from "@/components/home/BottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import {
  appBrandSoftButtonClass,
  appCardClass,
  appCardPaddingClass,
  appSectionMetaClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
  appSolidButtonClass,
} from "@/components/layout/appSurface";
import {
  MAGIC_LINK_CROSS_BROWSER_COPY,
  MAGIC_LINK_NEWEST_ONLY_WARNING,
  MAGIC_LINK_RATE_LIMIT_COOLDOWN_SECONDS,
  MAGIC_LINK_RATE_LIMIT_MESSAGE,
  MAGIC_LINK_RESEND_COOLDOWN_SECONDS,
  formatMagicLinkCooldownMessage,
  magicLinkCallbackUserMessage,
  parseMagicLinkAuthErrorParam,
  type MagicLinkCallbackFailureKind,
} from "@/lib/auth/magicLinkErrors";
import { startExamplePortfolio } from "@/lib/services/examplePortfolio/startExamplePortfolio";
import type { ExamplePortfolioTemplate } from "@/lib/services/examplePortfolio/types";
import { EXAMPLE_KEEP_PORTFOLIO_HREF } from "@/lib/services/examplePortfolio/types";
import { PUBLIC_EXPLORE_DESTINATIONS } from "@/lib/content/publicExplore";

const TEMPLATES: Array<{
  id: ExamplePortfolioTemplate;
  title: string;
  description: string;
  recommended?: boolean;
}> = [
  {
    id: "global",
    title: "Global Investor",
    description: "Global ETFs, Bitcoin, gold and cash.",
    recommended: true,
  },
  {
    id: "income",
    title: "Income Investor",
    description: "Dividend investments, income exposure and cash.",
  },
];

type ExploreView = "form" | "check_email" | "recovery";

export default function ExplorePage() {
  const [email, setEmail] = useState("");
  const [template, setTemplate] = useState<ExamplePortfolioTemplate>("global");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ExploreView>("form");
  const [recoveryKind, setRecoveryKind] =
    useState<MagicLinkCallbackFailureKind | null>(null);
  const [expired, setExpired] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [pending, startTransition] = useTransition();

  const emailValid = useMemo(
    () => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()),
    [email],
  );
  const requestDisabled = pending || cooldownSeconds > 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = parseMagicLinkAuthErrorParam(params.get("auth_error"));
    const legacyError = params.get("error");

    if (authError) {
      setRecoveryKind(authError);
      setView("recovery");
      setError(magicLinkCallbackUserMessage(authError));
      if (authError === "rate_limited") {
        setCooldownSeconds(MAGIC_LINK_RATE_LIMIT_COOLDOWN_SECONDS);
      }
      return;
    }

    if (legacyError) {
      setRecoveryKind("failed");
      setView("recovery");
      setError(legacyError);
    }
  }, []);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);

  function clearUrlAuthParams() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("auth_error") && !url.searchParams.has("error")) {
      return;
    }
    url.searchParams.delete("auth_error");
    url.searchParams.delete("error");
    window.history.replaceState({}, "", `${url.pathname}${url.search}`);
  }

  function requestLink() {
    setError(null);
    setMessage(null);
    setExpired(false);

    if (!emailValid) {
      setError("Enter a valid email address.");
      return;
    }

    if (requestDisabled) {
      return;
    }

    startTransition(async () => {
      const result = await startExamplePortfolio({ email, template });
      if (result.ok) {
        setView("check_email");
        setRecoveryKind(null);
        setCooldownSeconds(MAGIC_LINK_RESEND_COOLDOWN_SECONDS);
        setMessage(
          result.status === "already_active"
            ? "Your active Example Portfolio already exists. Check your email to sign in."
            : "Check your email to continue.",
        );
        clearUrlAuthParams();
        return;
      }

      if (result.status === "expired") {
        setExpired(true);
        setView("form");
        setError(result.message);
        return;
      }

      if (result.status === "rate_limited") {
        setView("recovery");
        setRecoveryKind("rate_limited");
        setError(MAGIC_LINK_RATE_LIMIT_MESSAGE);
        setCooldownSeconds(MAGIC_LINK_RATE_LIMIT_COOLDOWN_SECONDS);
        return;
      }

      setError(result.message);
      if (view === "recovery") {
        setView("recovery");
      }
    });
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    requestLink();
  }

  function backToSignIn() {
    setView("form");
    setRecoveryKind(null);
    setError(null);
    setMessage(null);
    setExpired(false);
    clearUrlAuthParams();
  }

  return (
    <>
      <PageContainer stackClassName="gap-5 md:gap-6">
        <section
          className={`${appCardClass} ${appCardPaddingClass}`}
          aria-labelledby="explore-example-heading"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1
                id="explore-example-heading"
                className="text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[1.75rem]"
              >
                Explore Tobailey
              </h1>
              <p className={`mt-2 ${appSectionSubtitleClass}`}>
                Start with a personal Example Portfolio. Edit everything and
                explore the full platform for 7 days.
              </p>
            </div>
          </div>

          {view === "check_email" ? (
            <div className="mt-6 space-y-4">
              <div
                className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4"
                role="status"
              >
                <p className="text-[15px] font-semibold text-emerald-950">
                  Check your email to continue.
                </p>
                <p className={`mt-1 ${appSectionMetaClass}`}>
                  We sent a sign-in link to{" "}
                  <span className="font-semibold text-slate-800">
                    {email.trim()}
                  </span>
                  .
                </p>
                <p className={`mt-3 ${appSectionMetaClass}`}>
                  {MAGIC_LINK_CROSS_BROWSER_COPY}
                </p>
                <p className={`mt-2 ${appSectionMetaClass}`}>
                  {MAGIC_LINK_NEWEST_ONLY_WARNING}
                </p>
              </div>

              {cooldownSeconds > 0 ? (
                <p className={appSectionMetaClass} role="status">
                  {formatMagicLinkCooldownMessage(cooldownSeconds)}
                </p>
              ) : null}

              <button
                type="button"
                disabled={requestDisabled}
                onClick={requestLink}
                className={`w-full ${appSolidButtonClass}`}
              >
                {pending
                  ? "Sending link…"
                  : cooldownSeconds > 0
                    ? "Wait to request another link"
                    : "Send a new login link"}
              </button>

              <button
                type="button"
                onClick={backToSignIn}
                className={`w-full ${appBrandSoftButtonClass}`}
              >
                Back to sign in
              </button>
            </div>
          ) : view === "recovery" ? (
            <div className="mt-6 space-y-4">
              <div
                className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4"
                role="alert"
              >
                <p className="text-[15px] font-semibold text-amber-950">
                  Sign-in link could not be completed
                </p>
                <p className={`mt-2 ${appSectionMetaClass}`}>
                  {error ??
                    magicLinkCallbackUserMessage(recoveryKind ?? "failed")}
                </p>
                {email.trim() ? (
                  <p className={`mt-2 ${appSectionMetaClass}`}>
                    Email:{" "}
                    <span className="font-semibold text-slate-800">
                      {email.trim()}
                    </span>
                  </p>
                ) : null}
                <p className={`mt-3 ${appSectionMetaClass}`}>
                  {MAGIC_LINK_NEWEST_ONLY_WARNING}
                </p>
              </div>

              <div>
                <label
                  htmlFor="example-email-recovery"
                  className="text-[13px] font-semibold text-slate-700"
                >
                  Email
                </label>
                <input
                  id="example-email-recovery"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-[16px] text-slate-950 outline-none ring-brand/30 placeholder:text-slate-400 focus:border-brand focus:ring-2"
                  placeholder="you@email.com"
                />
              </div>

              {cooldownSeconds > 0 ? (
                <p className={appSectionMetaClass} role="status">
                  {formatMagicLinkCooldownMessage(cooldownSeconds)}
                </p>
              ) : null}

              <button
                type="button"
                disabled={requestDisabled || !emailValid}
                onClick={requestLink}
                className={`w-full ${appSolidButtonClass}`}
              >
                {pending
                  ? "Sending link…"
                  : cooldownSeconds > 0
                    ? "Wait to request another link"
                    : "Send a new login link"}
              </button>

              <button
                type="button"
                onClick={backToSignIn}
                className={`w-full ${appBrandSoftButtonClass}`}
              >
                Back to sign in
              </button>

              <p className={`text-center ${appSectionMetaClass}`}>
                Prefer a password account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-blue-700 hover:text-blue-900"
                >
                  Go to sign in
                </Link>
              </p>
            </div>
          ) : (
            <form className="mt-6 space-y-5" onSubmit={onSubmit} noValidate>
              <div>
                <label
                  htmlFor="example-email"
                  className="text-[13px] font-semibold text-slate-700"
                >
                  Email
                </label>
                <input
                  id="example-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-2 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-3 text-[16px] text-slate-950 outline-none ring-brand/30 placeholder:text-slate-400 focus:border-brand focus:ring-2"
                  placeholder="you@email.com"
                  aria-invalid={Boolean(error) && !emailValid}
                />
              </div>

              <fieldset>
                <legend className="text-[13px] font-semibold text-slate-700">
                  Choose a portfolio
                </legend>
                <div className="mt-3 grid gap-3">
                  {TEMPLATES.map((item) => {
                    const selected = template === item.id;
                    return (
                      <label
                        key={item.id}
                        className={`flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition focus-within:ring-2 focus-within:ring-brand/40 ${
                          selected
                            ? "border-brand bg-brand-soft/60"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="template"
                          value={item.id}
                          checked={selected}
                          onChange={() => setTemplate(item.id)}
                          className="mt-1 h-4 w-4 accent-[var(--brand)]"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="text-[15px] font-bold text-slate-950">
                              {item.title}
                            </span>
                            {item.recommended ? (
                              <span className="rounded-full bg-navy-hero px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                                Recommended
                              </span>
                            ) : null}
                          </span>
                          <span className={`mt-1 block ${appSectionMetaClass}`}>
                            {item.description}
                          </span>
                        </span>
                        {selected ? (
                          <Check
                            className="mt-0.5 h-4 w-4 shrink-0 text-brand"
                            aria-hidden
                          />
                        ) : null}
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {error ? (
                <p
                  className="text-[14px] font-medium text-rose-700"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              {cooldownSeconds > 0 ? (
                <p className={appSectionMetaClass} role="status">
                  {formatMagicLinkCooldownMessage(cooldownSeconds)}
                </p>
              ) : null}

              {expired ? (
                <Link
                  href={EXAMPLE_KEEP_PORTFOLIO_HREF}
                  className={appSolidButtonClass}
                >
                  Keep my portfolio
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              ) : null}

              <button
                type="submit"
                disabled={requestDisabled}
                className={`w-full ${appSolidButtonClass}`}
              >
                {pending
                  ? "Sending link…"
                  : cooldownSeconds > 0
                    ? "Wait to request another link"
                    : "Explore free for 7 days"}
              </button>

              <ul className="space-y-1.5 text-[13px] font-medium text-slate-600">
                <li>Full access for 7 days</li>
                <li>No credit card required</li>
                <li>Your changes are saved</li>
              </ul>

              <div className="pt-1">
                <Link href="/signup" className={appBrandSoftButtonClass}>
                  Add my own portfolio
                </Link>
              </div>
            </form>
          )}

          {message && view === "form" ? (
            <p className={`mt-4 ${appSectionMetaClass}`} role="status">
              {message}
            </p>
          ) : null}
        </section>

        <section
          className={`${appCardClass} ${appCardPaddingClass}`}
          aria-labelledby="ready-make-yours-heading"
          data-testid="demo-to-personal-cta"
        >
          <h2 id="ready-make-yours-heading" className={appSectionTitleClass}>
            Ready to make it yours?
          </h2>
          <p className={`mt-2 ${appSectionSubtitleClass}`}>
            Start your 7-day trial and replace the demo with your own
            investments.
          </p>
          <Link href="/signup" className={`mt-4 ${appSolidButtonClass}`}>
            Create your own portfolio
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>

        <TrialStepsCard showCreateCta />

        <section aria-labelledby="browse-without-account-heading">
          <h2
            id="browse-without-account-heading"
            className={appSectionTitleClass}
          >
            Browse without signing in
          </h2>
          <p className={`mt-1 ${appSectionSubtitleClass}`}>
            Perspectives, Market Pulse, News and Supported Instruments stay open
            to everyone.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PUBLIC_EXPLORE_DESTINATIONS.map((destination) => (
              <Link
                key={destination.href}
                href={destination.href}
                className={`${appCardClass} ${appCardPaddingClass} transition hover:border-slate-300`}
              >
                <p className="text-[15px] font-bold text-slate-950">
                  {destination.title}
                </p>
                <p className={`mt-1 ${appSectionMetaClass}`}>
                  {destination.description}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </PageContainer>
      <BottomNavigation />
    </>
  );
}

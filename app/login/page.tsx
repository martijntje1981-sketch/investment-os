import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";

import { LoginForm } from "@/components/auth/LoginForm";
import { TobaileyLogo } from "@/components/brand/TobaileyLogo";
import { BRAND } from "@/lib/brand";

const benefits = [
  "Access your personal investment dashboard",
  "Keep your portfolio, goals and briefing together",
  "Continue securely across devices",
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { error, message, next } = await searchParams;
  const { safeAuthRedirectPath } = await import("@/lib/auth/routeAccess");
  const safeNext = safeAuthRedirectPath(next, "/dashboard");

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center"
            >
              <TobaileyLogo size={44} showWordmark showTagline />
            </Link>

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-16">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-brand">
                Welcome back
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] text-brand-navy sm:text-5xl">
                Sign in to
                <span className="block text-slate-400">
                  {BRAND.name}
                </span>
              </h1>

              <p className="mt-5 text-base leading-7 text-slate-600">
                {BRAND.tagline} Access your portfolio, personalised market
                briefing and long-term financial goals.
              </p>
            </div>

            <LoginForm nextPath={safeNext} message={message} error={error} />

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />

              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                New to {BRAND.name}?
              </span>

              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <Link
              href="/signup"
              className="inline-flex h-14 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-100"
            >
              Create an account
            </Link>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              Your account is protected with secure authentication.
            </p>
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-brand-navy px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand/25 blur-3xl" />
          <div className="absolute -bottom-48 -left-32 h-[520px] w-[520px] rounded-full bg-brand/15 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200">
              <ShieldCheck className="h-4 w-4 text-brand" />
              {BRAND.tagline}
            </div>

            <h2 className="mt-8 max-w-2xl text-5xl font-black leading-[1.02] tracking-[-0.055em]">
              One secure place for your portfolio, strategy and goal.
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              {BRAND.name} helps private investors understand their
              portfolio, follow relevant developments and stay focused
              on long-term progress.
            </p>

            <div className="mt-10 space-y-4">
              {benefits.map((benefit) => (
                <div
                  key={benefit}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400 text-slate-950">
                    <Check className="h-4 w-4" />
                  </div>

                  <p className="font-semibold text-slate-100">
                    {benefit}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative rounded-[28px] border border-white/10 bg-white/5 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Privacy first
            </p>

            <p className="mt-3 text-xl font-bold">
              Your portfolio stays personal
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Secure authentication and privacy controls help protect
              access to your investment information.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

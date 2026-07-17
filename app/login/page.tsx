import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { login } from "@/app/auth/actions";

const benefits = [
  "Access your personal investment dashboard",
  "Keep your portfolio, goals and briefing together",
  "Continue securely across devices",
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                <Sparkles className="h-5 w-5" />
              </div>

              <div>
                <p className="text-sm font-black tracking-[-0.02em]">
                  Investment OS
                </p>

                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Complete investment system
                </p>
              </div>
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
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                Welcome back
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                Sign in to your
                <span className="block text-slate-400">
                  Investment OS
                </span>
              </h1>

              <p className="mt-5 text-base leading-7 text-slate-600">
                Access your portfolio, personalised market briefing
                and long-term financial goals.
              </p>
            </div>

            <form
              className="mt-9 space-y-5"
              action={login}
            >
              {message && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                  {message}
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                  {error}
                </div>
              )}
              <div>
                <label
                  htmlFor="email"
                  className="text-sm font-bold text-slate-800"
                >
                  Email address
                </label>

                <div className="relative mt-2">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="you@example.com"
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between gap-4">
                  <label
                    htmlFor="password"
                    className="text-sm font-bold text-slate-800"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-sm font-bold text-blue-700 transition hover:text-blue-900"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="relative mt-2">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    placeholder="Enter your password"
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  name="remember"
                  className="h-4 w-4 rounded border-slate-300 accent-slate-950"
                />

                Keep me signed in
              </label>

              <button
                type="submit"
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Sign in
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="my-7 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />

              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                New to Investment OS?
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

        <section className="relative hidden overflow-hidden bg-slate-950 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-violet-600/25 blur-3xl" />
          <div className="absolute -bottom-48 -left-32 h-[520px] w-[520px] rounded-full bg-blue-600/20 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Your investment control centre
            </div>

            <h2 className="mt-8 max-w-2xl text-5xl font-black leading-[1.02] tracking-[-0.055em]">
              One secure place for your portfolio, strategy and goal.
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Investment OS helps private investors understand their
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

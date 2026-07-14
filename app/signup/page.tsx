import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

const benefits = [
  "Create your personal investment dashboard",
  "Connect your portfolio and long-term goal",
  "Receive intelligence linked to your holdings",
];

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
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

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-14">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-blue-600">
                Create your account
              </p>

              <h1 className="mt-3 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                Build your personal
                <span className="block text-slate-400">
                  Investment OS
                </span>
              </h1>

              <p className="mt-5 text-base leading-7 text-slate-600">
                Bring your portfolio, market context and
                long-term financial goal together in one
                clear investment control centre.
              </p>
            </div>

            <form
              className="mt-8 space-y-4"
              action="/dashboard"
            >
              <div>
                <label
                  htmlFor="name"
                  className="text-sm font-bold text-slate-800"
                >
                  Full name
                </label>

                <div className="relative mt-2">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    placeholder="Your full name"
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
                  />
                </div>
              </div>

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
                <label
                  htmlFor="password"
                  className="text-sm font-bold text-slate-800"
                >
                  Password
                </label>

                <div className="relative mt-2">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="At least 8 characters"
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-bold text-slate-800"
                >
                  Confirm password
                </label>

                <div className="relative mt-2">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    placeholder="Repeat your password"
                    className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 pt-1 text-sm leading-6 text-slate-600">
                <input
                  type="checkbox"
                  name="terms"
                  required
                  className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-slate-950"
                />

                <span>
                  I agree to the{" "}
                  <Link
                    href="/terms"
                    className="font-bold text-blue-700 hover:text-blue-900"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="font-bold text-blue-700 hover:text-blue-900"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              <button
                type="submit"
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
              >
                Create account
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            <div className="my-6 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />

              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Already have an account?
              </span>

              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <Link
              href="/login"
              className="inline-flex h-14 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-100"
            >
              Sign in
            </Link>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              This is currently a visual beta signup.
              Secure account creation and database storage
              will be connected before public access.
            </p>
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950 to-violet-950 px-12 py-14 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-40 -top-40 h-[540px] w-[540px] rounded-full bg-violet-600/25 blur-3xl" />

          <div className="absolute -bottom-48 -left-32 h-[540px] w-[540px] rounded-full bg-blue-600/20 blur-3xl" />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Built for private investors
            </div>

            <h2 className="mt-8 max-w-2xl text-5xl font-black leading-[1.02] tracking-[-0.055em]">
              Start with your portfolio. Build towards
              your financial goal.
            </h2>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Investment OS helps you understand what you
              own, what is influencing it and what is
              required to reach your long-term target.
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
              Private beta access
            </p>

            <p className="mt-3 text-xl font-bold">
              Join before the public release
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              Beta users will help test the portfolio
              workflow, personalised briefing and goal
              engine before paid subscriptions are
              introduced.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
import Link from "next/link";
import { ArrowLeft, ArrowRight, KeyRound, Mail, Sparkles } from "lucide-react";

import { requestPasswordReset } from "@/app/auth/actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-md">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="font-black">Investment OS</span>
        </Link>

        <div className="mt-16 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-xl sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-7 text-4xl font-black tracking-[-0.045em]">
            Reset your password
          </h1>
          <p className="mt-4 leading-7 text-slate-600">
            Enter the email address connected to your account. We will send you
            a secure link to choose a new password.
          </p>

          <form action={requestPasswordReset} noValidate className="mt-8 space-y-5">
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
              <label htmlFor="email" className="text-sm font-bold text-slate-800">
                Email address
              </label>
              <div className="relative mt-2">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-medium outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
                />
              </div>
            </div>

            <button className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800">
              Send reset link
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <Link href="/login" className="mt-7 flex items-center justify-center gap-2 text-sm font-bold text-blue-700">
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

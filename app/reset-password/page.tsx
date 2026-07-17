import Link from "next/link";
import { ArrowRight, KeyRound, LockKeyhole, Sparkles } from "lucide-react";

import { updatePassword } from "@/app/auth/actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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
            Choose a new password
          </h1>
          <p className="mt-4 leading-7 text-slate-600">
            Use at least eight characters and choose a password you do not use
            elsewhere.
          </p>

          <form action={updatePassword} noValidate className="mt-8 space-y-5">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
                {error}
              </div>
            )}

            <PasswordField id="password" label="New password" />
            <PasswordField id="confirmPassword" label="Confirm new password" />

            <button className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800">
              Update password
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function PasswordField({ id, label }: { id: string; label: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-bold text-slate-800">
        {label}
      </label>
      <div className="relative mt-2">
        <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          id={id}
          name={id}
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-medium outline-none transition focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
        />
      </div>
    </div>
  );
}

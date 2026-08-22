"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, Mail } from "lucide-react";

import { login } from "@/app/auth/actions";
import { safeAuthRedirectPath } from "@/lib/auth/routeAccess";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({
  nextPath,
  message,
  error,
}: {
  nextPath: string;
  message?: string;
  error?: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [clientError, setClientError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const visibleError = clientError ?? error ?? null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const nextRaw = String(formData.get("next") ?? "").trim();

    if (!email || !password) {
      setClientError("Enter your email address and password.");
      return;
    }

    setPending(true);
    setClientError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setPending(false);
      setClientError("The email address or password is incorrect.");
      return;
    }

    router.replace(safeAuthRedirectPath(nextRaw, "/dashboard"));
    router.refresh();
  }

  return (
    <form className="mt-9 space-y-5" action={login} onSubmit={handleSubmit}>
      <input type="hidden" name="next" value={nextPath} />
      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      )}

      {visibleError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {visibleError}
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
            required
            placeholder="you@example.com"
            className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-4 focus:ring-slate-950/5"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <label htmlFor="password" className="text-sm font-bold text-slate-800">
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
        disabled={pending}
        className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-sm font-bold text-brand-navy shadow-lg transition hover:-translate-y-0.5 hover:bg-brand-hover disabled:cursor-wait disabled:hover:translate-y-0"
      >
        {pending ? "Signing in" : "Sign in"}
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

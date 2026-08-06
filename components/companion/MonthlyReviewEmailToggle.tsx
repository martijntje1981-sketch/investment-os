"use client";

import { useEffect, useState } from "react";

import { appSectionMetaClass } from "@/components/layout/appSurface";

type MonthlyReviewEmailToggleProps = {
  disabledForDemo?: boolean;
};

export function MonthlyReviewEmailToggle({
  disabledForDemo = false,
}: MonthlyReviewEmailToggleProps) {
  const [optIn, setOptIn] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void fetch("/api/review/email-preference", { credentials: "same-origin" })
      .then(async (response) => {
        const payload = (await response.json()) as {
          optIn?: boolean;
          emailConfigured?: boolean;
        };
        if (!active) return;
        setOptIn(Boolean(payload.optIn));
        setConfigured(payload.emailConfigured !== false);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
        setConfigured(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function onChange(next: boolean) {
    if (disabledForDemo || saving || loading) return;
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/review/email-preference", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn: next }),
      });
      const payload = (await response.json()) as {
        optIn?: boolean;
        error?: string;
        emailConfigured?: boolean;
      };
      if (!response.ok) {
        setConfigured(payload.emailConfigured !== false);
        setMessage(payload.error ?? "Could not save preference.");
        return;
      }
      setOptIn(Boolean(payload.optIn));
      setMessage(payload.optIn ? "Saved — we’ll email when ready." : "Email notifications off.");
    } catch {
      setMessage("Could not save preference.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-slate-950">
            Email me when my monthly review is ready
          </p>
          <p className={`mt-1 ${appSectionMetaClass}`}>
            Receive a private notification after each completed month. Emails
            contain no portfolio values or holdings.
          </p>
        </div>
        <label className="relative inline-flex min-h-[44px] min-w-[52px] cursor-pointer items-center">
          <span className="sr-only">Monthly review email</span>
          <input
            type="checkbox"
            className="peer sr-only"
            checked={optIn}
            disabled={
              disabledForDemo || loading || saving || !configured
            }
            onChange={(event) => void onChange(event.target.checked)}
          />
          <span
            className="h-7 w-12 rounded-full bg-slate-200 transition peer-checked:bg-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-disabled:opacity-40"
            aria-hidden
          />
          <span
            className="absolute left-1 top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition peer-checked:translate-x-5"
            aria-hidden
          />
        </label>
      </div>
      {disabledForDemo ? (
        <p className={`mt-2 ${appSectionMetaClass}`}>
          Demo accounts do not receive review emails.
        </p>
      ) : null}
      {!configured && !disabledForDemo ? (
        <p className={`mt-2 ${appSectionMetaClass}`} role="status">
          Email delivery is not configured yet. Reviews remain available in the
          app.
        </p>
      ) : null}
      {message ? (
        <p className={`mt-2 ${appSectionMetaClass}`} role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

import { appSectionMetaClass } from "@/components/layout/appSurface";

type MonthlyReviewEmailToggleProps = {
  disabledForDemo?: boolean;
};

/**
 * Monthly review email opt-in (default OFF).
 * Preference persists independently of Resend configuration.
 * Weekly email is not offered — delivery is not implemented.
 */
export function MonthlyReviewEmailToggle({
  disabledForDemo = false,
}: MonthlyReviewEmailToggleProps) {
  const [optIn, setOptIn] = useState(false);
  const [deliveryReady, setDeliveryReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/review/email-preference", { credentials: "same-origin" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setLoading(false);
          setLoadError(true);
          return;
        }
        const payload = (await response.json()) as {
          optIn?: boolean;
          emailConfigured?: boolean;
        };
        setOptIn(Boolean(payload.optIn));
        setDeliveryReady(payload.emailConfigured !== false);
        setLoadError(false);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
        setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function onChange(next: boolean) {
    if (disabledForDemo || saving || loading || loadError) return;
    const previous = optIn;
    setOptIn(next);
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
        deliveryNote?: string | null;
      };
      if (!response.ok) {
        setOptIn(previous);
        setMessage(payload.error ?? "Could not save preference.");
        return;
      }
      setOptIn(Boolean(payload.optIn));
      if (typeof payload.emailConfigured === "boolean") {
        setDeliveryReady(payload.emailConfigured);
      }
      if (payload.deliveryNote) {
        setMessage(payload.deliveryNote);
      } else {
        setMessage(
          payload.optIn
            ? "Saved — we’ll notify you when your monthly review is ready."
            : "Email notifications off.",
        );
      }
    } catch {
      setOptIn(previous);
      setMessage("Could not save preference.");
    } finally {
      setSaving(false);
    }
  }

  const controlDisabled =
    disabledForDemo || loading || saving || loadError;

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
      data-testid="monthly-review-email-toggle"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-bold text-slate-950">
            Email reviews
          </p>
          <p className={`mt-1 ${appSectionMetaClass}`}>
            Receive a short notification when your monthly portfolio review is
            ready. Emails contain a link only — not your portfolio values or
            holdings.
          </p>
          <p className={`mt-2 text-[13px] font-semibold text-slate-800`}>
            Monthly review email
          </p>
        </div>
        <label
          className={`relative inline-flex min-h-[44px] min-w-[52px] items-center ${
            controlDisabled ? "cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <span className="sr-only">Monthly review email</span>
          <input
            type="checkbox"
            className="peer sr-only"
            checked={optIn}
            disabled={controlDisabled}
            onChange={(event) => void onChange(event.target.checked)}
            data-testid="monthly-review-email-checkbox"
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
          Demo accounts do not receive personal review emails.
        </p>
      ) : null}
      {loadError && !disabledForDemo ? (
        <p className={`mt-2 ${appSectionMetaClass}`} role="status">
          Preference could not be loaded. Refresh to try again.
        </p>
      ) : null}
      {!deliveryReady && !disabledForDemo && !loadError ? (
        <p className={`mt-2 ${appSectionMetaClass}`} role="status">
          You can save this preference now. Delivery starts once email is
          configured. Reviews remain available in the app.
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

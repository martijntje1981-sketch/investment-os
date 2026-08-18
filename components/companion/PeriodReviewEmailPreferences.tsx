"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { appSectionMetaClass, appTextLinkClass } from "@/components/layout/appSurface";
import { isEligibleForPeriodReportEmail } from "@/lib/services/periodIntelligence/email/eligibility";
import type { ProductAccess } from "@/lib/services/productAccess";

type PeriodReviewEmailPreferencesProps = {
  access: ProductAccess;
  disabledForDemo?: boolean;
};

function Toggle({
  label,
  srLabel,
  checked,
  disabled,
  testId,
  onChange,
}: {
  label: string;
  srLabel: string;
  checked: boolean;
  disabled: boolean;
  testId: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <p className="min-w-0 text-[14px] font-semibold text-slate-900">{label}</p>
      <label
        className={`relative inline-flex min-h-[44px] min-w-[52px] items-center ${
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        }`}
      >
        <span className="sr-only">{srLabel}</span>
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          data-testid={testId}
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
  );
}

/**
 * Weekly + monthly personal review email opt-in (default OFF).
 * Preference persists independently of Resend configuration.
 */
export function PeriodReviewEmailPreferences({
  access,
  disabledForDemo = false,
}: PeriodReviewEmailPreferencesProps) {
  const eligible = isEligibleForPeriodReportEmail(access);
  const [weeklyOptIn, setWeeklyOptIn] = useState(false);
  const [monthlyOptIn, setMonthlyOptIn] = useState(false);
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
          weeklyOptIn?: boolean;
          monthlyOptIn?: boolean;
          emailConfigured?: boolean;
        };
        setWeeklyOptIn(Boolean(payload.weeklyOptIn));
        setMonthlyOptIn(Boolean(payload.monthlyOptIn));
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

  async function save(patch: { weeklyOptIn?: boolean; monthlyOptIn?: boolean }) {
    if (disabledForDemo || saving || loading || loadError) return;
    const previous = { weeklyOptIn, monthlyOptIn };
    if (typeof patch.weeklyOptIn === "boolean") setWeeklyOptIn(patch.weeklyOptIn);
    if (typeof patch.monthlyOptIn === "boolean") setMonthlyOptIn(patch.monthlyOptIn);
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/review/email-preference", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = (await response.json()) as {
        weeklyOptIn?: boolean;
        monthlyOptIn?: boolean;
        error?: string;
        emailConfigured?: boolean;
        deliveryNote?: string | null;
      };
      if (!response.ok) {
        setWeeklyOptIn(previous.weeklyOptIn);
        setMonthlyOptIn(previous.monthlyOptIn);
        setMessage(payload.error ?? "Could not save preference.");
        return;
      }
      setWeeklyOptIn(Boolean(payload.weeklyOptIn));
      setMonthlyOptIn(Boolean(payload.monthlyOptIn));
      if (typeof payload.emailConfigured === "boolean") {
        setDeliveryReady(payload.emailConfigured);
      }
      setMessage(
        payload.deliveryNote ??
          (payload.weeklyOptIn || payload.monthlyOptIn
            ? "Saved. You can change this anytime."
            : "Email reports off."),
      );
    } catch {
      setWeeklyOptIn(previous.weeklyOptIn);
      setMonthlyOptIn(previous.monthlyOptIn);
      setMessage("Could not save preference.");
    } finally {
      setSaving(false);
    }
  }

  const controlDisabled =
    disabledForDemo || loading || saving || loadError || !eligible;

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
      data-testid="period-review-email-preferences"
    >
      <div className="min-w-0">
        <p className="text-[15px] font-bold text-slate-950">Email reports</p>
        <p className={`mt-1 ${appSectionMetaClass}`}>
          Receive your Tobailey weekly or monthly investment review by email.
          You can change this anytime.
        </p>
      </div>

      {!eligible && !disabledForDemo ? (
        <p className={`mt-3 ${appSectionMetaClass}`}>
          Personal review emails are included with Complete.{" "}
          <Link href={access.upgradeHref} className={appTextLinkClass}>
            {access.upgradeCtaLabel}
          </Link>
        </p>
      ) : null}

      <div className="mt-2 divide-y divide-slate-100">
        <div>
          <p className={`text-[13px] ${appSectionMetaClass}`}>
            Receive your Tobailey weekly investment review by email.
          </p>
          <Toggle
            label="Weekly personal review"
            srLabel="Weekly personal review email"
            checked={weeklyOptIn}
            disabled={controlDisabled}
            testId="weekly-review-email-checkbox"
            onChange={(next) => void save({ weeklyOptIn: next })}
          />
        </div>
        <div>
          <p className={`pt-3 text-[13px] ${appSectionMetaClass}`}>
            Receive your Tobailey monthly investment review by email.
          </p>
          <Toggle
            label="Monthly personal review"
            srLabel="Monthly personal review email"
            checked={monthlyOptIn}
            disabled={controlDisabled}
            testId="monthly-review-email-checkbox"
            onChange={(next) => void save({ monthlyOptIn: next })}
          />
        </div>
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

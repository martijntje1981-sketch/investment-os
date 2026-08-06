/**
 * Privacy-first monthly review notification email.
 * Subject/body contain no portfolio values or holdings.
 */

import {
  formatYearMonthLabel,
  type MonthlyReviewSnapshotRow,
} from "@/lib/services/portfolio/companion/snapshotTypes";
import { isMonthlyReviewEmailConfigured } from "@/lib/services/portfolio/companion/emailPreference";
import { REVIEW_PATH } from "@/lib/navigation/appRoutes";

export type MonthlyReviewEmailContent = {
  subject: string;
  previewText: string;
  html: string;
  text: string;
};

function siteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.tobailey.com";
  return raw.replace(/\/$/, "");
}

export function buildMonthlyReviewEmailContent(
  yearMonth: string,
): MonthlyReviewEmailContent {
  const monthLabel = formatYearMonthLabel(yearMonth);
  const reviewUrl = `${siteOrigin()}${REVIEW_PATH}?period=monthly&month=${encodeURIComponent(yearMonth)}`;
  const settingsUrl = `${siteOrigin()}/settings#reports-email`;
  const subject = `Your ${monthLabel.replace(/ \d{4}$/, "")} Portfolio Review is ready`;
  const previewText =
    "Your completed monthly review is now available in Tobailey.";

  const text = [
    previewText,
    "",
    "View monthly review:",
    reviewUrl,
    "",
    "Monthly review emails contain no portfolio values or holdings. Sign in to view the full review.",
    "",
    "Manage email preference:",
    settingsUrl,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Georgia,serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(previewText)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;padding:28px 24px;border:1px solid #e2e8f0;">
        <tr><td>
          <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;font-family:system-ui,sans-serif;">Tobailey</p>
          <h1 style="margin:12px 0 0;font-size:24px;line-height:1.25;">Your ${escapeHtml(monthLabel)} review is ready</h1>
          <p style="margin:16px 0 0;font-size:16px;line-height:1.55;color:#334155;">${escapeHtml(previewText)}</p>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.5;color:#475569;">See your performance, contributions, goal progress and key portfolio developments in the app.</p>
          <p style="margin:28px 0 0;">
            <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:#38bdf8;color:#0f172a;text-decoration:none;font-family:system-ui,sans-serif;font-weight:700;font-size:15px;padding:14px 20px;border-radius:12px;">View monthly review</a>
          </p>
          <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#64748b;font-family:system-ui,sans-serif;">Monthly review emails contain no portfolio values or holdings.</p>
          <p style="margin:8px 0 0;font-size:13px;font-family:system-ui,sans-serif;"><a href="${escapeHtml(settingsUrl)}" style="color:#0369a1;">Manage email preference</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, previewText, html, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type SendMonthlyReviewEmailResult =
  | { ok: true; providerId: string | null }
  | { ok: false; reason: string; retryable: boolean };

/**
 * Send via Resend HTTP API when configured. Never logs financial content.
 */
export async function sendMonthlyReviewReadyEmail(input: {
  to: string;
  yearMonth: string;
}): Promise<SendMonthlyReviewEmailResult> {
  if (!isMonthlyReviewEmailConfigured()) {
    return {
      ok: false,
      reason: "email_not_configured",
      retryable: false,
    };
  }

  const apiKey = process.env.RESEND_API_KEY!.trim();
  const from = process.env.EMAIL_FROM!.trim();
  const content = buildMonthlyReviewEmailContent(input.yearMonth);

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: content.subject,
        html: content.html,
        text: content.text,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.info("[monthly-review-email] send_failed", {
        status,
        yearMonth: input.yearMonth,
      });
      return {
        ok: false,
        reason: `provider_${status}`,
        retryable: status >= 500 || status === 429,
      };
    }

    const payload = (await response.json()) as { id?: string };
    return { ok: true, providerId: payload.id ?? null };
  } catch {
    console.info("[monthly-review-email] send_error", {
      yearMonth: input.yearMonth,
    });
    return { ok: false, reason: "network_error", retryable: true };
  }
}

export function snapshotEligibleForEmail(
  row: Pick<MonthlyReviewSnapshotRow, "status" | "emailed_at">,
): boolean {
  return row.status === "ready" && !row.emailed_at;
}

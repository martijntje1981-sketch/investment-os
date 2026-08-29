/**
 * Shared Resend HTTP send for review emails.
 * Never logs recipients, subjects with values, or HTML bodies.
 */

import { isReviewEmailConfigured } from "@/lib/services/portfolio/companion/emailPreference";

export type ResendSendResult =
  | { ok: true; providerId: string | null }
  | { ok: false; reason: "email_not_configured" | "provider_error" | "network_error"; retryable: boolean };

export async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<ResendSendResult> {
  if (!isReviewEmailConfigured()) {
    return { ok: false, reason: "email_not_configured", retryable: false };
  }

  const apiKey = process.env.RESEND_API_KEY!.trim();
  const from = process.env.EMAIL_FROM!.trim();

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
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      console.info("[period-review-email] provider_failed", { status });
      return {
        ok: false,
        reason: "provider_error",
        retryable: status >= 500 || status === 429,
      };
    }

    const payload = (await response.json()) as { id?: string };
    return { ok: true, providerId: payload.id ?? null };
  } catch {
    console.info("[period-review-email] network_error");
    return { ok: false, reason: "network_error", retryable: true };
  }
}

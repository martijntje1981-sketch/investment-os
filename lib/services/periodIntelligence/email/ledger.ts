/**
 * Idempotent send ledger for weekly/monthly personal review emails.
 * Does not store email bodies.
 */

import type { PeriodIntelligenceKind } from "@/lib/services/periodIntelligence/types";
import type { PeriodReportEmailSkipReason } from "@/lib/services/periodIntelligence/email/eligibility";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LedgerClient = { from: (table: string) => any };

export type PeriodReviewEmailSendRow = {
  user_id: string;
  report_kind: PeriodIntelligenceKind;
  period_key: string;
  sent_at: string | null;
  provider_message_id: string | null;
  status: "sent" | "skipped" | "failed";
  skip_reason: string | null;
};

export async function getPeriodReviewEmailSend(
  client: LedgerClient,
  input: {
    userId: string;
    kind: PeriodIntelligenceKind;
    periodKey: string;
  },
): Promise<PeriodReviewEmailSendRow | null> {
  const { data, error } = await client
    .from("period_review_email_sends")
    .select(
      "user_id, report_kind, period_key, sent_at, provider_message_id, status, skip_reason",
    )
    .eq("user_id", input.userId)
    .eq("report_kind", input.kind)
    .eq("period_key", input.periodKey)
    .maybeSingle();

  if (error) throw new Error(error.message || "Could not load email send.");
  return (data as PeriodReviewEmailSendRow | null) ?? null;
}

export function hasSuccessfulPeriodReviewEmailSend(
  row: PeriodReviewEmailSendRow | null,
): boolean {
  return row?.status === "sent";
}

export async function recordPeriodReviewEmailSend(
  client: LedgerClient,
  input: {
    userId: string;
    kind: PeriodIntelligenceKind;
    periodKey: string;
    status: "sent" | "skipped" | "failed";
    providerMessageId?: string | null;
    skipReason?: PeriodReportEmailSkipReason | string | null;
  },
): Promise<"inserted" | "exists"> {
  const { error } = await client.from("period_review_email_sends").insert({
    user_id: input.userId,
    report_kind: input.kind,
    period_key: input.periodKey,
    sent_at: input.status === "sent" ? new Date().toISOString() : null,
    provider_message_id: input.providerMessageId ?? null,
    status: input.status,
    skip_reason: input.skipReason ?? null,
  });

  if (!error) return "inserted";
  if (String(error.code) === "23505" || /duplicate|unique/i.test(error.message ?? "")) {
    return "exists";
  }
  throw new Error(error.message || "Could not record email send.");
}

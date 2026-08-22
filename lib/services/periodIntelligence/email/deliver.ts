/**
 * Trusted scheduled delivery of weekly/monthly personal review emails.
 * Never accepts client JSON. Never logs portfolio values or addresses.
 */

import type { User } from "@supabase/supabase-js";

import { resolveCompletedIntelligencePeriod } from "@/lib/services/changeIntelligence/periodKeys";
import {
  getIntelligenceStateSnapshot,
  getPreviousIntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/repository";
import { resolveProductAccessFromAuthUser } from "@/lib/services/productAccess/resolveFromAuthUser";
import { resolveCompanionPeriodWindow } from "@/lib/services/portfolio/companion/periodWindows";
import {
  isReviewEmailConfigured,
  readReviewEmailOptIn,
} from "@/lib/services/portfolio/companion/emailPreference";
import { yearMonthFromIsoDate } from "@/lib/services/portfolio/companion/snapshotTypes";
import { getMonthlyReviewSnapshot } from "@/lib/services/portfolio/companion/monthlySnapshotRepository";
import { markMonthlyReviewEmailed } from "@/lib/services/portfolio/companion/monthlySnapshotRepository";
import type { PeriodIntelligenceKind } from "@/lib/services/periodIntelligence/types";
import {
  evaluatePeriodReportEmailDelivery,
  type PeriodReportEmailSkipReason,
} from "@/lib/services/periodIntelligence/email/eligibility";
import {
  getPeriodReviewEmailSend,
  hasSuccessfulPeriodReviewEmailSend,
  recordPeriodReviewEmailSend,
} from "@/lib/services/periodIntelligence/email/ledger";
import {
  buildTrustedMonthlyPeriodReview,
  buildTrustedWeeklyPeriodReview,
} from "@/lib/services/periodIntelligence/email/buildTrustedPeriodReview";
import { toPeriodReportEmailView } from "@/lib/services/periodIntelligence/email/viewModel";
import { renderPeriodReportEmail } from "@/lib/services/periodIntelligence/email/render";
import { sendResendEmail } from "@/lib/services/periodIntelligence/email/resendSend";

export type DeliveryAdmin = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
  auth: { admin: { getUserById: (id: string) => Promise<{ data: { user: User | null }; error: unknown }> } };
};

export type PeriodReviewEmailJobResult = {
  ok: true;
  kind: PeriodIntelligenceKind;
  periodKey: string | null;
  sent: number;
  skipped: number;
  failed: number;
  candidates: number;
  skipReasons: Partial<Record<PeriodReportEmailSkipReason, number>>;
};

function bump(
  counts: Partial<Record<PeriodReportEmailSkipReason, number>>,
  reason: PeriodReportEmailSkipReason,
) {
  counts[reason] = (counts[reason] ?? 0) + 1;
}

function uniqueCandidates(
  rows: Array<{ userId: string; portfolioId: string | null }>,
): Array<{ userId: string; portfolioId: string | null }> {
  const seen = new Set<string>();
  const unique: Array<{ userId: string; portfolioId: string | null }> = [];
  for (const row of rows) {
    if (seen.has(row.userId)) continue;
    seen.add(row.userId);
    unique.push(row);
  }
  return unique;
}

function completedMonthlyKey(now: Date): string | null {
  const window = resolveCompanionPeriodWindow("monthly", now, {
    preferCompletedMonth: true,
  });
  if (window.periodKind !== "calendar_month") return null;
  return yearMonthFromIsoDate(window.startDate);
}

async function loadUser(admin: DeliveryAdmin, userId: string): Promise<User | null> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) return null;
  return data.user ?? null;
}

type DeliverOneResult =
  | { status: "sent"; reason: null }
  | { status: "skipped"; reason: PeriodReportEmailSkipReason }
  | { status: "failed"; reason: PeriodReportEmailSkipReason };

async function deliverOne(input: {
  admin: DeliveryAdmin;
  kind: PeriodIntelligenceKind;
  periodKey: string;
  userId: string;
  portfolioId?: string | null;
}): Promise<DeliverOneResult> {
  const user = await loadUser(input.admin, input.userId);
  const email = user?.email?.trim() ?? null;
  const access = user
    ? await resolveProductAccessFromAuthUser(user)
    : null;

  const { data: settings } = await input.admin
    .from("user_settings")
    .select("preferences")
    .eq("user_id", input.userId)
    .maybeSingle();
  const optedIn = readReviewEmailOptIn(
    (settings?.preferences as Record<string, unknown> | null) ?? null,
    input.kind,
  );

  const existing = await getPeriodReviewEmailSend(input.admin, {
    userId: input.userId,
    kind: input.kind,
    periodKey: input.periodKey,
  });

  let review = null;
  let monthlyAlreadyEmailed = false;
  if (input.kind === "weekly") {
    const portfolioId = input.portfolioId;
    if (portfolioId) {
      const current = await getIntelligenceStateSnapshot(input.admin, {
        userId: input.userId,
        portfolioId,
        snapshotKind: "weekly",
        periodKey: input.periodKey,
      });
      const previous = current
        ? await getPreviousIntelligenceStateSnapshot(input.admin, {
            userId: input.userId,
            portfolioId,
            snapshotKind: "weekly",
            periodKey: input.periodKey,
          })
        : null;
      review = buildTrustedWeeklyPeriodReview({ current, previous });
    }
  } else {
    const row = await getMonthlyReviewSnapshot(
      input.admin,
      input.userId,
      input.periodKey,
    );
    monthlyAlreadyEmailed = Boolean(row?.emailed_at);
    const current = row
      ? await getIntelligenceStateSnapshot(input.admin, {
          userId: input.userId,
          portfolioId: row.portfolio_id,
          snapshotKind: "monthly",
          periodKey: input.periodKey,
        })
      : null;
    const previous = current
      ? await getPreviousIntelligenceStateSnapshot(input.admin, {
          userId: input.userId,
          portfolioId: row!.portfolio_id,
          snapshotKind: "monthly",
          periodKey: input.periodKey,
        })
      : null;
    review = buildTrustedMonthlyPeriodReview({
      payload: row?.payload,
      periodKey: input.periodKey,
      currentSnapshot: current,
      previousSnapshot: previous,
    });
  }

  const decision = evaluatePeriodReportEmailDelivery({
    configured: isReviewEmailConfigured(),
    access: access ?? {
      tier: "free",
      intelligenceDepth: "free",
      isCompleteTrial: false,
      daysRemaining: 0,
      expiresAt: null,
      trialIndicatorLabel: null,
      upgradeHref: "/pricing",
      upgradeCtaLabel: "Get Complete",
      isDemo: false,
      preservesUserData: true,
      maxPortfolios: 1,
    },
    optedIn,
    email,
    reviewPresent: Boolean(review),
    reviewReady: Boolean(review?.ready),
    reviewIsDemo: Boolean(review?.isDemo),
    alreadySent:
      hasSuccessfulPeriodReviewEmailSend(existing) || monthlyAlreadyEmailed,
  });

  if (!decision.send) {
    return { status: "skipped", reason: decision.reason };
  }

  const rendered = renderPeriodReportEmail(toPeriodReportEmailView(review!));
  const sent = await sendResendEmail({
    to: email!,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
  });

  if (!sent.ok) {
    return { status: "failed", reason: sent.reason };
  }

  const recorded = await recordPeriodReviewEmailSend(input.admin, {
    userId: input.userId,
    kind: input.kind,
    periodKey: input.periodKey,
    status: "sent",
    providerMessageId: sent.providerId,
  });
  if (recorded === "exists") {
    return { status: "skipped", reason: "already_sent" };
  }
  if (input.kind === "monthly") {
    await markMonthlyReviewEmailed(
      input.admin,
      input.userId,
      input.periodKey,
      "sent",
    ).catch(() => undefined);
  }
  return { status: "sent", reason: null };
}

export async function deliverPeriodReviewEmails(input: {
  admin: DeliveryAdmin;
  kind: PeriodIntelligenceKind;
  now?: Date;
  limit?: number;
}): Promise<PeriodReviewEmailJobResult> {
  const now = input.now ?? new Date();
  const limit = input.limit ?? 200;
  const skipReasons: Partial<Record<PeriodReportEmailSkipReason, number>> = {};

  const periodKey =
    input.kind === "weekly"
      ? resolveCompletedIntelligencePeriod("weekly", now).periodKey
      : completedMonthlyKey(now);

  if (!periodKey) {
    return {
      ok: true,
      kind: input.kind,
      periodKey: null,
      sent: 0,
      skipped: 0,
      failed: 0,
      candidates: 0,
      skipReasons: { missing_report: 1 },
    };
  }

  let candidates: Array<{ userId: string; portfolioId: string | null }> = [];

  if (input.kind === "weekly") {
    const { data, error } = await input.admin
      .from("intelligence_state_snapshots")
      .select("user_id, portfolio_id")
      .eq("snapshot_kind", "weekly")
      .eq("period_key", periodKey)
      .limit(limit);
    if (error) throw new Error(error.message || "Could not list weekly snapshots.");
    candidates = uniqueCandidates(
      (data ?? []).map((row: { user_id: string; portfolio_id: string }) => ({
        userId: row.user_id,
        portfolioId: row.portfolio_id,
      })),
    );
  } else {
    const { data, error } = await input.admin
      .from("monthly_review_snapshots")
      .select("user_id, portfolio_id")
      .eq("year_month", periodKey)
      .eq("status", "ready")
      .limit(limit);
    if (error) throw new Error(error.message || "Could not list monthly reviews.");
    candidates = uniqueCandidates(
      (data ?? []).map((row: { user_id: string; portfolio_id: string }) => ({
        userId: row.user_id,
        portfolioId: row.portfolio_id,
      })),
    );
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of candidates) {
    try {
      const result = await deliverOne({
        admin: input.admin,
        kind: input.kind,
        periodKey,
        userId: row.userId,
        portfolioId: row.portfolioId,
      });
      if (result.status === "sent") sent += 1;
      else if (result.status === "failed") {
        failed += 1;
        bump(skipReasons, result.reason);
      } else {
        skipped += 1;
        bump(skipReasons, result.reason);
      }
    } catch {
      failed += 1;
      bump(skipReasons, "provider_error");
      console.info("[period-review-email] user_failed", { kind: input.kind });
    }
  }

  console.info("[period-review-email] complete", {
    kind: input.kind,
    periodKey,
    sent,
    skipped,
    failed,
    candidates: candidates.length,
  });

  return {
    ok: true,
    kind: input.kind,
    periodKey,
    sent,
    skipped,
    failed,
    candidates: candidates.length,
    skipReasons,
  };
}

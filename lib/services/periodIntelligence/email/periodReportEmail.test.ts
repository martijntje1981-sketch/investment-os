/**
 * Phase 9C — weekly/monthly personal review email.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { resolveCompletedIntelligencePeriod } from "@/lib/services/changeIntelligence/periodKeys";
import {
  buildChangeIntelligenceSummary,
  summarizeStoredChangeIntelligence,
} from "@/lib/services/changeIntelligence";
import type {
  IntelligenceStatePayload,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";
import {
  PERIOD_ADVICE_PATTERNS,
  PERIOD_CAUSAL_PATTERNS,
  PERIOD_FIRST_HISTORY_COPY,
  PERIOD_NO_MATERIAL_CHANGE_COPY,
} from "@/lib/services/periodIntelligence/config";
import {
  buildTrustedMonthlyPeriodReview,
  buildTrustedWeeklyPeriodReview,
  deliverPeriodReviewEmails,
  evaluatePeriodReportEmailDelivery,
  isEligibleForPeriodReportEmail,
  renderPeriodReportEmail,
  toPeriodReportEmailView,
} from "@/lib/services/periodIntelligence/email";
import {
  getPeriodReviewEmailSend,
  hasSuccessfulPeriodReviewEmailSend,
  recordPeriodReviewEmailSend,
} from "@/lib/services/periodIntelligence/email/ledger";
import { GET as weeklyCronGet } from "@/app/api/cron/weekly-review-email/route";
import { GET as monthlyCronGet } from "@/app/api/cron/monthly-review/route";
import {
  readMonthlyReviewEmailOptIn,
  readWeeklyReviewEmailOptIn,
  updatePeriodReviewEmailPreferences,
} from "@/lib/services/portfolio/companion/emailPreference";
import { buildCompanionReview } from "@/lib/services/portfolio/companion";
import type { MonthlyReviewSnapshotPayload } from "@/lib/services/portfolio/companion/snapshotTypes";
import { resolveProductAccess } from "@/lib/services/productAccess";
import { isCronAuthorized } from "@/lib/server/cronAuth";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import type { PeriodIntelligenceReview } from "@/lib/services/periodIntelligence/types";
import { applyPeriodIntelligenceDepth } from "@/lib/services/periodIntelligence/applyPeriodIntelligenceDepth";
import { buildPeriodIntelligenceReview } from "@/lib/services/periodIntelligence/buildPeriodIntelligenceReview";

const mocks = vi.hoisted(() => ({
  getSnap: vi.fn(),
  getPrev: vi.fn(),
  getMonthly: vi.fn(),
  markEmailed: vi.fn(),
  resolveAccess: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/services/changeIntelligence/repository", () => ({
  getIntelligenceStateSnapshot: mocks.getSnap,
  getPreviousIntelligenceStateSnapshot: mocks.getPrev,
}));

vi.mock("@/lib/services/portfolio/companion/monthlySnapshotRepository", () => ({
  getMonthlyReviewSnapshot: mocks.getMonthly,
  markMonthlyReviewEmailed: mocks.markEmailed,
}));

vi.mock("@/lib/services/productAccess/resolveFromAuthUser", () => ({
  resolveProductAccessFromAuthUser: mocks.resolveAccess,
}));

vi.mock("@/lib/services/periodIntelligence/email/resendSend", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/services/periodIntelligence/email/resendSend")
  >();
  return {
    ...actual,
    sendResendEmail: mocks.sendEmail,
  };
});

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function listEmailFiles(): string[] {
  const dir = path.resolve(process.cwd(), "lib/services/periodIntelligence/email");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .map((name) => `lib/services/periodIntelligence/email/${name}`);
}

function points(values: Array<[string, number]>): PortfolioPerformancePoint[] {
  return values.map(([date, portfolioValue]) => ({
    date,
    portfolioValue,
    netContributions: null,
    investmentReturn: null,
  }));
}

function emptyPayload(): IntelligenceStatePayload {
  return {
    schemaVersion: 1,
    isDemo: false,
    portfolio: {
      totalValue: 100_000,
      coverage: {
        holdingCount: 2,
        valuedHoldingCount: 2,
        unvaluedHoldingCount: 0,
        portfolioValueAvailable: true,
      },
    },
    holdings: [],
    exposure: {
      groups: [
        {
          groupId: "fixed_income",
          displayLabel: "Fixed income",
          weightPercent: 24,
        },
      ],
      classifiedHoldingCount: 2,
      unclassifiedHoldingCount: 0,
      coverageLabel: null,
    },
    concentration: {
      largestHoldingId: "bnd",
      largestHoldingSymbol: "AGGH",
      largestHoldingName: "Global Aggregate Bond ETF",
      largestHoldingWeightPercent: 24,
      hhi: 0.2,
      concentrationLevel: "balanced",
    },
    goal: {
      goalId: "goal-1",
      targetValue: 250_000,
      targetYear: 2035,
      progressPercent: 40,
      monthlyContribution: 400,
      expectedAnnualReturnPercent: 6,
      portfolioValueAvailable: true,
    },
    resilience: {
      status: "ok",
      score: 70,
      bandId: "balanced",
      bandLabel: "Balanced",
      primaryDriver: "diversification",
      factors: [{ id: "diversification", score: 70 }],
      mostSensitive: {
        scenarioId: "global_equities_minus_20",
        scenarioName: "Global equities -20%",
        estimatedPortfolioImpactPercent: 12,
      },
    },
    scorecard: null,
  };
}

function snapshot(
  overrides: Partial<IntelligenceStateSnapshot> & {
    payload?: Partial<IntelligenceStatePayload>;
  } = {},
): IntelligenceStateSnapshot {
  const base = emptyPayload();
  return {
    id: overrides.id ?? "snap-1",
    userId: "user-1",
    portfolioId: "p1",
    snapshotKind: overrides.snapshotKind ?? "weekly",
    schemaVersion: 1,
    periodKey: overrides.periodKey ?? "2026-W33",
    periodStart: overrides.periodStart ?? "2026-08-10",
    periodEnd: overrides.periodEnd ?? "2026-08-16",
    capturedAt: overrides.capturedAt ?? "2026-08-17T08:00:00.000Z",
    timezone: "Europe/Amsterdam",
    payload: {
      ...base,
      ...overrides.payload,
      portfolio: overrides.payload?.portfolio ?? base.portfolio,
      holdings: overrides.payload?.holdings ?? base.holdings,
      exposure: overrides.payload?.exposure ?? base.exposure,
      concentration: {
        ...base.concentration,
        ...overrides.payload?.concentration,
      },
      goal:
        overrides.payload && "goal" in overrides.payload
          ? overrides.payload.goal ?? null
          : base.goal,
      resilience: overrides.payload?.resilience ?? base.resilience,
      scorecard: overrides.payload?.scorecard ?? null,
      isDemo: overrides.payload?.isDemo ?? false,
    },
  };
}

function monthlyCompanion() {
  return buildCompanionReview("monthly", {
    now: new Date("2026-08-06T12:00:00.000Z"),
    holdingCount: 2,
    monthSeries: points([
      ["2026-07-01", 96_000],
      ["2026-07-31", 100_000],
    ]),
    monthBestHoldingName: "Global Aggregate Bond ETF",
    monthWorstHoldingName: "Euro cash",
    hasSavedGoal: true,
    goalStatus: "On track",
    goalProgressPercent: 40,
    concentrationWeightPercent: 24,
  });
}

function monthlyPayload(): MonthlyReviewSnapshotPayload {
  const review = monthlyCompanion();
  return {
    schemaVersion: 1,
    review,
    metrics: review.metrics!,
  };
}

function fiSnapshots() {
  const previous = snapshot({
    snapshotKind: "monthly",
    periodKey: "2026-06",
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    payload: {
      exposure: {
        groups: [
          {
            groupId: "diversified_equity",
            displayLabel: "Diversified equity",
            weightPercent: 82,
          },
          {
            groupId: "fixed_income",
            displayLabel: "Fixed income",
            weightPercent: 18,
          },
        ],
        classifiedHoldingCount: 2,
        unclassifiedHoldingCount: 0,
        coverageLabel: null,
      },
    },
  });
  const current = snapshot({
    id: "snap-2",
    snapshotKind: "monthly",
    periodKey: "2026-07",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-31",
    payload: {
      exposure: {
        groups: [
          {
            groupId: "diversified_equity",
            displayLabel: "Diversified equity",
            weightPercent: 76,
          },
          {
            groupId: "fixed_income",
            displayLabel: "Fixed income",
            weightPercent: 24,
          },
        ],
        classifiedHoldingCount: 2,
        unclassifiedHoldingCount: 0,
        coverageLabel: null,
      },
    },
  });
  return { previous, current };
}

function completeAccess() {
  return resolveProductAccess({ exampleKind: "converted" });
}

function trialAccess() {
  return resolveProductAccess({
    exampleKind: "active",
    trialKind: "personal",
    daysRemaining: 10,
  });
}

function freeAccess() {
  return resolveProductAccess({ exampleKind: "none" });
}

function demoAccess() {
  return resolveProductAccess({ exampleKind: "active" });
}

function decisionBase() {
  return {
    configured: true,
    access: completeAccess(),
    optedIn: true,
    email: "owner@example.com",
    reviewReady: true,
    reviewPresent: true,
    reviewIsDemo: false,
    alreadySent: false,
  };
}

function emailBody(review: PeriodIntelligenceReview) {
  return renderPeriodReportEmail(toPeriodReportEmailView(review));
}

type LedgerRow = {
  user_id: string;
  report_kind: string;
  period_key: string;
  sent_at: string | null;
  provider_message_id: string | null;
  status: string;
  skip_reason: string | null;
};

function createAdmin(options: {
  userId?: string;
  email?: string | null;
  weeklyOptIn?: boolean;
  monthlyOptIn?: boolean;
  candidates?: Array<{ user_id: string; portfolio_id: string }>;
  ledger?: LedgerRow[];
}) {
  const userId = options.userId ?? "user-1";
  const ledger = options.ledger ?? [];
  return {
    ledger,
    auth: {
      admin: {
        getUserById: async (id: string) => ({
          data: {
            user:
              id === userId
                ? {
                    id,
                    email: options.email === undefined ? "owner@example.com" : options.email,
                    user_metadata: {},
                    app_metadata: {},
                    aud: "authenticated",
                    created_at: "2026-01-01T00:00:00.000Z",
                  }
                : null,
          },
          error: null,
        }),
      },
    },
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const builder: {
        select: () => typeof builder;
        eq: (col: string, val: unknown) => typeof builder;
        lt: () => typeof builder;
        order: () => typeof builder;
        limit: () => typeof builder;
        maybeSingle: () => Promise<{ data: unknown; error: null }>;
        insert: (row: LedgerRow) => Promise<{ error: { code: string; message: string } | null }>;
        update: () => typeof builder;
        then: (resolve: (value: { data: unknown; error: null }) => void) => Promise<void>;
      } = {
        select: () => builder,
        eq: (col, val) => {
          filters[col] = val;
          return builder;
        },
        lt: () => builder,
        order: () => builder,
        limit: () => builder,
        maybeSingle: async () => {
          if (table === "user_settings") {
            return {
              data: {
                preferences: {
                  weekly_review_email_opt_in: options.weeklyOptIn === true,
                  monthly_review_email_opt_in: options.monthlyOptIn === true,
                },
              },
              error: null,
            };
          }
          if (table === "period_review_email_sends") {
            const row = ledger.find(
              (item) =>
                item.user_id === filters.user_id &&
                item.report_kind === filters.report_kind &&
                item.period_key === filters.period_key,
            );
            return { data: row ?? null, error: null };
          }
          return { data: null, error: null };
        },
        insert: async (row) => {
          if (
            ledger.some(
              (item) =>
                item.user_id === row.user_id &&
                item.report_kind === row.report_kind &&
                item.period_key === row.period_key,
            )
          ) {
            return { error: { code: "23505", message: "duplicate" } };
          }
          ledger.push(row);
          return { error: null };
        },
        update: () => builder,
        then: (resolve) =>
          Promise.resolve({
            data: options.candidates ?? [],
            error: null,
          }).then(resolve),
      };
      return builder;
    },
  };
}

describe("Phase 9C period review email", () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.EMAIL_FROM;
  const previousSite = process.env.NEXT_PUBLIC_SITE_URL;
  const previousCron = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Tobailey <reviews@tobailey.com>";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.tobailey.com";
    process.env.CRON_SECRET = "test-cron-secret";
    mocks.getSnap.mockReset();
    mocks.getPrev.mockReset();
    mocks.getMonthly.mockReset();
    mocks.markEmailed.mockReset();
    mocks.resolveAccess.mockReset();
    mocks.sendEmail.mockReset();
    mocks.sendEmail.mockResolvedValue({ ok: true, providerId: "msg_1" });
    mocks.markEmailed.mockResolvedValue(undefined);
    mocks.resolveAccess.mockResolvedValue(completeAccess());
  });

  afterEach(() => {
    process.env.RESEND_API_KEY = previousKey;
    process.env.EMAIL_FROM = previousFrom;
    process.env.NEXT_PUBLIC_SITE_URL = previousSite;
    process.env.CRON_SECRET = previousCron;
  });

  it("1. weekly opt-in defaults off", () => {
    expect(readWeeklyReviewEmailOptIn(null)).toBe(false);
    expect(readWeeklyReviewEmailOptIn({})).toBe(false);
  });

  it("2. monthly opt-in defaults off", () => {
    expect(readMonthlyReviewEmailOptIn(null)).toBe(false);
    expect(readMonthlyReviewEmailOptIn({})).toBe(false);
  });

  it("3. preference save works without Resend configured", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
        insert,
        update: () => ({ eq: async () => ({ error: null }) }),
      })),
    };
    const prefs = await updatePeriodReviewEmailPreferences(client, "user-1", {
      weeklyOptIn: true,
      monthlyOptIn: true,
    });
    expect(prefs.weeklyOptIn).toBe(true);
    expect(prefs.monthlyOptIn).toBe(true);
    expect(read("app/api/review/email-preference/route.ts")).toContain(
      "Preference may be saved even when Resend",
    );
  });

  it("4. Free user is not eligible for full report email", () => {
    expect(isEligibleForPeriodReportEmail(freeAccess())).toBe(false);
    expect(
      evaluatePeriodReportEmailDelivery({
        ...decisionBase(),
        access: freeAccess(),
      }).reason,
    ).toBe("not_eligible");
  });

  it("5. Complete is eligible", () => {
    expect(isEligibleForPeriodReportEmail(completeAccess())).toBe(true);
    expect(evaluatePeriodReportEmailDelivery(decisionBase())).toEqual({
      send: true,
      reason: null,
    });
  });

  it("6. Complete trial is eligible", () => {
    expect(isEligibleForPeriodReportEmail(trialAccess())).toBe(true);
    expect(
      evaluatePeriodReportEmailDelivery({
        ...decisionBase(),
        access: trialAccess(),
      }).send,
    ).toBe(true);
  });

  it("7. Demo is never delivered", () => {
    expect(isEligibleForPeriodReportEmail(demoAccess())).toBe(false);
    expect(
      evaluatePeriodReportEmailDelivery({
        ...decisionBase(),
        access: demoAccess(),
      }).reason,
    ).toBe("demo");
    expect(
      evaluatePeriodReportEmailDelivery({
        ...decisionBase(),
        reviewIsDemo: true,
      }).reason,
    ).toBe("demo");
    const demoSnap = snapshot({ payload: { isDemo: true } });
    expect(
      buildTrustedWeeklyPeriodReview({ current: demoSnap, previous: null }),
    ).toBeNull();
  });

  it("8. missing email is a safe skip", () => {
    expect(
      evaluatePeriodReportEmailDelivery({
        ...decisionBase(),
        email: "",
      }).reason,
    ).toBe("missing_email");
  });

  it("9. missing report is a safe skip", () => {
    expect(
      evaluatePeriodReportEmailDelivery({
        ...decisionBase(),
        reviewPresent: false,
        reviewReady: false,
      }).reason,
    ).toBe("missing_report");
    expect(
      buildTrustedWeeklyPeriodReview({ current: null, previous: null }),
    ).toBeNull();
  });

  it("10. insufficient history does not fabricate change", () => {
    const review = buildTrustedWeeklyPeriodReview({
      current: snapshot(),
      previous: null,
    });
    expect(review?.firstHistory).toBe(true);
    const rendered = emailBody(review!);
    expect(rendered.html).toContain(PERIOD_FIRST_HISTORY_COPY);
    expect(rendered.text).toContain(PERIOD_FIRST_HISTORY_COPY);
    expect(rendered.html).not.toMatch(/increased from|decreased from/i);
  });

  it("11. monthly saved report email uses the stored Companion payload", () => {
    const { previous, current } = fiSnapshots();
    const review = buildTrustedMonthlyPeriodReview({
      payload: monthlyPayload(),
      periodKey: "2026-07",
      currentSnapshot: current,
      previousSnapshot: previous,
    });
    expect(review?.kind).toBe("monthly");
    expect(review?.ready).toBe(true);
    const rendered = emailBody(review!);
    expect(rendered.subject).toMatch(/Tobailey/i);
    expect(rendered.html).toContain("Your personal investment review");
    expect(rendered.html).toContain("View full review in Tobailey");
  });

  it("12. archived monthly report does not mix live Change Intelligence", () => {
    const liveNow = snapshot({
      snapshotKind: "monthly",
      periodKey: "2026-08",
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
      payload: {
        concentration: { largestHoldingWeightPercent: 90 },
      },
    });
    const archived = buildTrustedMonthlyPeriodReview({
      payload: monthlyPayload(),
      periodKey: "2026-07",
      currentSnapshot: liveNow,
      previousSnapshot: null,
    });
    const storedOnly = buildTrustedMonthlyPeriodReview({
      payload: monthlyPayload(),
      periodKey: "2026-07",
      currentSnapshot: null,
      previousSnapshot: null,
    });
    expect(archived?.changed?.headline).toBe(storedOnly?.changed?.headline);
    expect(archived?.firstHistory).toBe(storedOnly?.firstHistory);
    const liveChange = buildChangeIntelligenceSummary({
      previous: snapshot({
        snapshotKind: "monthly",
        periodKey: "2026-07",
      }),
      current: liveNow,
    });
    expect(archived?.changed?.headline).not.toBe(liveChange.primaryStory?.headline);
  });

  it("13. weekly idempotency", async () => {
    const now = new Date("2026-08-18T12:00:00.000Z");
    const periodKey = resolveCompletedIntelligencePeriod("weekly", now).periodKey;
    const current = snapshot({ periodKey, snapshotKind: "weekly" });
    mocks.getSnap.mockResolvedValue(current);
    mocks.getPrev.mockResolvedValue(null);
    const admin = createAdmin({
      weeklyOptIn: true,
      candidates: [{ user_id: "user-1", portfolio_id: "p1" }],
    });

    const first = await deliverPeriodReviewEmails({
      admin,
      kind: "weekly",
      now,
    });
    const second = await deliverPeriodReviewEmails({
      admin,
      kind: "weekly",
      now,
    });
    expect(first.sent).toBe(1);
    expect(second.sent).toBe(0);
    expect(second.skipReasons.already_sent).toBe(1);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("14. monthly idempotency", async () => {
    const now = new Date("2026-08-18T12:00:00.000Z");
    mocks.getMonthly.mockResolvedValue({
      portfolio_id: "p1",
      payload: monthlyPayload(),
      emailed_at: null,
    });
    mocks.getSnap.mockResolvedValue(null);
    const admin = createAdmin({
      monthlyOptIn: true,
      candidates: [{ user_id: "user-1", portfolio_id: "p1" }],
    });
    const first = await deliverPeriodReviewEmails({
      admin,
      kind: "monthly",
      now,
    });
    const second = await deliverPeriodReviewEmails({
      admin,
      kind: "monthly",
      now,
    });
    expect(first.sent).toBe(1);
    expect(second.sent).toBe(0);
    expect(second.skipReasons.already_sent).toBe(1);
  });

  it("15. duplicate job does not resend", async () => {
    const existing = await getPeriodReviewEmailSend(
      {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      user_id: "user-1",
                      report_kind: "weekly",
                      period_key: "2026-W33",
                      sent_at: "2026-08-18T07:20:00.000Z",
                      provider_message_id: "msg_1",
                      status: "sent",
                      skip_reason: null,
                    },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        }),
      },
      { userId: "user-1", kind: "weekly", periodKey: "2026-W33" },
    );
    expect(hasSuccessfulPeriodReviewEmailSend(existing)).toBe(true);
    const duplicate = await recordPeriodReviewEmailSend(
      {
        from: () => ({
          insert: async () => ({
            error: { code: "23505", message: "duplicate key" },
          }),
        }),
      },
      {
        userId: "user-1",
        kind: "weekly",
        periodKey: "2026-W33",
        status: "sent",
      },
    );
    expect(duplicate).toBe("exists");
  });

  it("16. HTML renderer", () => {
    const review = buildTrustedWeeklyPeriodReview({
      current: snapshot(),
      previous: snapshot({
        id: "prev",
        periodKey: "2026-W32",
        periodStart: "2026-08-03",
        periodEnd: "2026-08-09",
        payload: { portfolio: { totalValue: 98_000, coverage: emptyPayload().portfolio.coverage } },
      }),
    });
    const html = emailBody(review!).html;
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("At a glance");
    expect(html).toContain("What happened");
    expect(html).toContain("View full review in Tobailey");
    expect(html).not.toContain("<script");
    expect(html).toContain("max-width:560px");
  });

  it("17. plain-text renderer", () => {
    const review = buildTrustedWeeklyPeriodReview({
      current: snapshot(),
      previous: null,
    });
    const text = emailBody(review!).text;
    expect(text).toContain("Tobailey");
    expect(text).toContain("Your personal investment review");
    expect(text).toContain("View full review in Tobailey:");
    expect(text).toContain("Download PDF in Tobailey:");
    expect(text).toContain("Manage email preferences:");
    expect(text).not.toContain("<div");
  });

  it("18. Perspective is labeled opinion", () => {
    const review = buildTrustedMonthlyPeriodReview({
      payload: monthlyPayload(),
      periodKey: "2026-07",
    });
    const withPerspective: PeriodIntelligenceReview = {
      ...review!,
      context: {
        kind: "perspective",
        channelLabel: "Perspective / opinion",
        headline: "A creator view on liquidity",
        detail: "Perspective/opinion from a trusted creator — not a news fact.",
        href: "https://www.youtube.com/watch?v=btc-macro",
        hrefExternal: true,
      },
    };
    const rendered = emailBody(withPerspective);
    expect(rendered.html).toContain("Perspective / opinion");
    expect(rendered.text).toContain("Perspective / opinion");
  });

  it("19. no causal or advice language", () => {
    const review = buildTrustedMonthlyPeriodReview({
      payload: monthlyPayload(),
      periodKey: "2026-07",
      currentSnapshot: fiSnapshots().current,
      previousSnapshot: fiSnapshots().previous,
    });
    const blob = `${emailBody(review!).html}\n${emailBody(review!).text}`;
    for (const pattern of PERIOD_CAUSAL_PATTERNS) {
      expect(blob).not.toMatch(pattern);
    }
    for (const pattern of PERIOD_ADVICE_PATTERNS) {
      expect(blob).not.toMatch(pattern);
    }
  });

  it("20. fixed-income canonical text passes through", () => {
    const { previous, current } = fiSnapshots();
    const review = buildTrustedMonthlyPeriodReview({
      payload: monthlyPayload(),
      periodKey: "2026-07",
      currentSnapshot: current,
      previousSnapshot: previous,
    });
    const blob = [
      review?.changed?.headline,
      ...(review?.changed?.evidence ?? []),
      emailBody(review!).html,
    ]
      .join(" ")
      .toLowerCase();
    expect(blob).toMatch(/fixed income/);
    expect(read("lib/services/periodIntelligence/email/render.ts")).not.toMatch(
      /classifyFixedIncome|durationBucket|creditQuality/,
    );
  });

  it("21. PDF is linked, not attached", () => {
    const rendered = emailBody(
      buildTrustedWeeklyPeriodReview({
        current: snapshot(),
        previous: null,
      })!,
    );
    expect(rendered.html).toContain("Download PDF in Tobailey");
    expect(rendered.html).toContain("https://www.tobailey.com/review?period=weekly");
    expect(rendered.html).not.toMatch(/attachment|application\/pdf/i);
    expect(read("lib/services/periodIntelligence/email/resendSend.ts")).not.toMatch(
      /attachments/,
    );
  });

  it("22. ownership/security — no client-trusted user_id or report JSON", () => {
    const weekly = read("app/api/cron/weekly-review-email/route.ts");
    const monthly = read("app/api/cron/monthly-review/route.ts");
    const prefs = read("app/api/review/email-preference/route.ts");
    const deliver = read("lib/services/periodIntelligence/email/deliver.ts");
    expect(weekly).not.toMatch(/request\.json|user_id/);
    expect(monthly).not.toMatch(/request\.json/);
    expect(prefs).toContain("auth.getUser()");
    expect(deliver).toContain("Never accepts client JSON");
    expect(deliver).not.toContain("request.json");
    expect(read("lib/services/periodIntelligence/email/ledger.ts")).toContain(
      "period_review_email_sends",
    );
  });

  it("23. cron secret guard", async () => {
    expect(isCronAuthorized(new Request("http://localhost/api/cron/weekly-review-email"))).toBe(
      false,
    );
    const unauthorized = await weeklyCronGet(
      new Request("http://localhost/api/cron/weekly-review-email"),
    );
    expect(unauthorized.status).toBe(401);
    const monthlyUnauthorized = await monthlyCronGet(
      new Request("http://localhost/api/cron/monthly-review"),
    );
    expect(monthlyUnauthorized.status).toBe(401);
    expect(read("app/api/cron/weekly-review-email/route.ts")).toContain("isCronAuthorized");
    expect(read("vercel.json")).toContain("/api/cron/weekly-review-email");
  });

  it("24. missing RESEND_API_KEY is a safe skip", () => {
    delete process.env.RESEND_API_KEY;
    expect(
      evaluatePeriodReportEmailDelivery({
        ...decisionBase(),
        configured: false,
      }).reason,
    ).toBe("email_not_configured");
  });

  it("25. provider error is a safe failure and can retry", async () => {
    mocks.sendEmail.mockResolvedValue({
      ok: false,
      reason: "provider_error",
      retryable: true,
    });
    const now = new Date("2026-08-18T12:00:00.000Z");
    const periodKey = resolveCompletedIntelligencePeriod("weekly", now).periodKey;
    mocks.getSnap.mockResolvedValue(snapshot({ periodKey, snapshotKind: "weekly" }));
    mocks.getPrev.mockResolvedValue(null);
    const admin = createAdmin({
      weeklyOptIn: true,
      candidates: [{ user_id: "user-1", portfolio_id: "p1" }],
    });
    const failed = await deliverPeriodReviewEmails({ admin, kind: "weekly", now });
    expect(failed.failed).toBe(1);
    expect(failed.sent).toBe(0);
    expect(admin.ledger).toHaveLength(0);

    mocks.sendEmail.mockResolvedValue({ ok: true, providerId: "msg_retry" });
    const retried = await deliverPeriodReviewEmails({ admin, kind: "weekly", now });
    expect(retried.sent).toBe(1);
  });

  it("26. adds no EODHD, OpenAI, or polling path", () => {
    const files = [
      ...listEmailFiles(),
      "app/api/cron/weekly-review-email/route.ts",
      "app/api/cron/monthly-review/route.ts",
      "app/api/review/email-preference/route.ts",
      "components/companion/PeriodReviewEmailPreferences.tsx",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/eodhd|openai|setInterval|puppeteer|playwright/i);
    }
    expect(read("lib/services/periodIntelligence/email/deliver.ts")).not.toContain(
      "executeEodhdApiCall",
    );
  });

  it("no-material-change copy is used when the canonical review says so", () => {
    const review = applyPeriodIntelligenceDepth(
      buildPeriodIntelligenceReview({
        kind: "weekly",
        companion: buildCompanionReview("weekly", {
          now: new Date("2026-08-17T12:00:00.000Z"),
          holdingCount: 2,
          weekSeries: points([
            ["2026-08-11", 100_000],
            ["2026-08-17", 100_200],
          ]),
        }),
        change: {
          ...summarizeStoredChangeIntelligence([]),
          noMaterialChange: true,
          status: "ready",
        },
        snapshotCount: 2,
      }),
      "complete",
    );
    if (review.noMaterialChange) {
      expect(emailBody(review).html).toContain(PERIOD_NO_MATERIAL_CHANGE_COPY);
    }
  });

  it("site links never hardcode localhost", () => {
    const urls = read("lib/services/periodIntelligence/email/urls.ts");
    expect(urls).not.toContain("localhost");
    expect(urls).toContain("NEXT_PUBLIC_SITE_URL");
    expect(urls).toContain("https://www.tobailey.com");
  });

  it("does not expose a bulk-send or test-send control", () => {
    const prefs = read("components/companion/PeriodReviewEmailPreferences.tsx");
    const settings = read("app/settings/page.tsx");
    expect(prefs).not.toMatch(/send test|bulk send|send now/i);
    expect(settings).not.toMatch(/send test|bulk send/i);
  });
});

describe("Phase 9C Resend helper without module mock", () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.EMAIL_FROM;

  afterEach(() => {
    process.env.RESEND_API_KEY = previousKey;
    process.env.EMAIL_FROM = previousFrom;
    vi.unstubAllGlobals();
  });

  it("returns email_not_configured when the API key is missing", async () => {
    const { sendResendEmail: actualSend } = await vi.importActual<
      typeof import("@/lib/services/periodIntelligence/email/resendSend")
    >("@/lib/services/periodIntelligence/email/resendSend");
    delete process.env.RESEND_API_KEY;
    process.env.EMAIL_FROM = "Tobailey <reviews@tobailey.com>";
    await expect(
      actualSend({
        to: "owner@example.com",
        subject: "Test",
        html: "<p>Hi</p>",
        text: "Hi",
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "email_not_configured",
      retryable: false,
    });
  });

  it("maps provider errors without logging the body", async () => {
    const { sendResendEmail: actualSend } = await vi.importActual<
      typeof import("@/lib/services/periodIntelligence/email/resendSend")
    >("@/lib/services/periodIntelligence/email/resendSend");
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Tobailey <reviews@tobailey.com>";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ message: "rate limited" }),
      }),
    );
    await expect(
      actualSend({
        to: "owner@example.com",
        subject: "Test",
        html: "<p>secret portfolio</p>",
        text: "secret portfolio",
      }),
    ).resolves.toEqual({
      ok: false,
      reason: "provider_error",
      retryable: true,
    });
    expect(read("lib/services/periodIntelligence/email/resendSend.ts")).not.toContain(
      "console.info(input",
    );
  });
});

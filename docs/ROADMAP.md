# Tobailey implementation roadmap

Internal design notes. Not a public product claim. Do not implement items below until explicitly approved.

## Closed

### Phase 7 — Four Questions intelligence

Closed. Production correctness for glance copy:

- Q2 does not repeat Q1’s daily-driver wording; structural concentration/exposure is used instead.
- Q3 Reality Check numerical pace comparison is glance-safe only when history quality is `strong` and at least one year is represented. Missing assumptions are not fabricated.

No further Phase 7 production deployments.

---

## Future — Weekly & Monthly Personal Investment Reports

**Status:** design only. Do not implement PDF generation, email delivery, or new report UI in this phase.

Tobailey should eventually create a concise, attractive **personal investment review** for the relevant week or month — a Complete feature, not a dashboard data dump.

Core questions over the period (not just today):

1. What happened?
2. What mattered?
3. Am I on track?
4. What's ahead?

### Intended sections

- **Executive summary** — start/end value, period return, contributions/withdrawals where available, strongest/weakest contributor, one-sentence Tobailey summary.
- **What happened?** — performance, contributors/detractors, breadth, notable portfolio events.
- **What mattered?** — structural insight, concentration/exposure changes, relevant portfolio-specific news, Perspective where appropriate.
- **Am I on track?** — goal and contribution progress, Reality Check, change in projected path only when sufficiently supported.
- **What's ahead?** — current sensitivities, supported scenarios, risks/attention points, upcoming items only where reliable data exists.
- **What changed?** — especially valuable after Phase 8 (concentration, exposure, resilience, goal progress, holding weights, sensitivity). Surface only material, stored-history-backed changes.

Tone: “Your personal investment review.” Never fabricate history, causality, or advice.

### Free vs Complete (reports)

Do not implement monetization behavior yet.

- **Free** — potentially a lightweight in-app monthly summary. Do not assume downloadable PDF or email is Free.
- **Complete** — full weekly review, full monthly review, deeper intelligence, change intelligence, relevant context; potentially downloadable PDF and automatic email with user controls (weekly on/off, monthly on/off).

### Reuse existing work — do not rebuild

Companion / monthly-review infrastructure already exists. Audit and extend it later:

- `lib/services/portfolio/companion/buildCompanionReview.ts` — deterministic daily/weekly/monthly reviews (no AI).
- `lib/services/portfolio/companion/monthlySnapshotRepository.ts` + `monthly_review_snapshots`
- `lib/services/portfolio/companion/monthlyReviewPdf.ts` / `monthlyReviewEmail.ts` (prepared; do not expand now)
- `app/api/review/monthly/route.ts`, `app/api/cron/monthly-review`
- Settings monthly email opt-in (`user_settings.preferences.monthly_review_email_opt_in`)
- Help centre copy already describes daily/weekly/monthly reviews and optional PDF/email

Phase 8 Change Intelligence should later feed Complete weekly/monthly reports. Do not duplicate engines.

Capability keys already reserved (not gated in UI yet): `period_briefings`, `change_intelligence`.

---

## Next — Phase 8 Change Intelligence

**Status:** Phase 8A + 8B implemented locally. Not committed. Not deployed. Phase 8C is not started.

Core question: “What meaningfully changed in this user’s portfolio?”

Compare **current stored intelligence state** vs **previous stored intelligence state**. Deterministic. No fabricated history. No AI. No buy/sell/rebalance recommendations.

Phase 8A adds:

- `intelligence_state_snapshots` (weekly ISO week / monthly calendar month, insert-if-absent)
- compact state including holding quantities
- `lib/services/changeIntelligence` compare engine
- persist API at `/api/intelligence/snapshots` (not wired to Dashboard)

Phase 8B (local, not committed, not deployed) surfaces Change Intelligence:

- Capture on existing Review weekly/monthly generation (idempotent POST), plus a Dashboard GET-first safety net when a completed period is missing. No new cron.
- `ChangeIntelligenceSummary` groups/ranks stored comparisons for Four Questions, Review, and later reports
- Q2 prefers material stored change over static concentration; Q3/Q4 use goal/resilience change when trustworthy
- Free: one concise headline; Complete: exact deltas + traceability
- Review “What changed?” only when comparable stored history exists

Phase 8 Change Intelligence will later feed Complete weekly/monthly reports (“What changed?”). Do not duplicate engines.

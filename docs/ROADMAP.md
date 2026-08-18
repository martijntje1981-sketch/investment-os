# Tobailey implementation roadmap

Internal design notes. Not a public product claim. Do not implement items below until explicitly approved.

## Closed

### Phase 8C — Period Intelligence

Closed. Canonical `PeriodIntelligenceReview` composes Companion + `ChangeIntelligenceSummary` for weekly/monthly Review. Daily Review is unchanged.

Do not recreate this object. Later renderers consume it without recalculating.

### Phase 8A + 8B — Change Intelligence

Closed and live in Production (`84bf908`). Stored weekly/monthly `intelligence_state_snapshots`, `compareIntelligenceStates()`, `ChangeIntelligenceSummary`, Review capture + Dashboard GET-first safety net, Q2/Q3/Q4 integration, Review “What changed?”.

Do not recreate these systems.

### Phase 7 — Four Questions intelligence

Closed. Production correctness for glance copy:

- Q2 does not repeat Q1’s daily-driver wording; structural concentration/exposure is used instead.
- Q3 Reality Check numerical pace comparison is glance-safe only when history quality is `strong` and at least one year is represented. Missing assumptions are not fabricated.

No further Phase 7 production deployments.

---

## Phase 9A — In-app personal report renderer

**Status:** implemented locally. Not committed. Not deployed. Stop for review. Do not start Phase 9B (PDF/email).

In-app weekly/monthly Review renders `PeriodIntelligenceReview` through `toPersonalReportViewModel` → `InAppReportRenderer`. See `lib/services/periodIntelligence/REPORT_RENDERER.md`.

Capability keys already reserved: `period_briefings`, `change_intelligence`.

---

## Future — PDF and email delivery

**Status:** design-only. Do not implement in 9A.

Same `PeriodIntelligenceReview` should feed PDF and email renderers later. No new intelligence engines.

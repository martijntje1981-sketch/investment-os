# Tobailey implementation roadmap

Internal design notes. Not a public product claim. Do not implement items below until explicitly approved.

## Closed

### Phase 8A + 8B — Change Intelligence

Closed and live in Production (`84bf908`). Stored weekly/monthly `intelligence_state_snapshots`, `compareIntelligenceStates()`, `ChangeIntelligenceSummary`, Review capture + Dashboard GET-first safety net, Q2/Q3/Q4 integration, Review “What changed?”.

Do not recreate these systems.

### Phase 7 — Four Questions intelligence

Closed. Production correctness for glance copy:

- Q2 does not repeat Q1’s daily-driver wording; structural concentration/exposure is used instead.
- Q3 Reality Check numerical pace comparison is glance-safe only when history quality is `strong` and at least one year is represented. Missing assumptions are not fabricated.

No further Phase 7 production deployments.

---

## Future — Weekly & Monthly Personal Investment Reports

**Status:** PDF and email remain design-only. Do not implement delivery in this phase.

In-app weekly/monthly Period Intelligence is implemented locally as `PeriodIntelligenceReview` (Phase 8C). Later email/PDF renderers should consume that object — see `lib/services/periodIntelligence/REPORT_RENDERER.md`.

Capability keys already reserved: `period_briefings`, `change_intelligence`.

---

## Next — Phase 8C Period Intelligence

**Status:** implemented locally. Not committed. Not deployed. Do not start Phase 8D (PDF/email).

Canonical object: `PeriodIntelligenceReview` in `lib/services/periodIntelligence`. Composes Companion + `ChangeIntelligenceSummary`.


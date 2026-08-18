# PeriodIntelligenceReview — renderer boundary

`PeriodIntelligenceReview` is the canonical weekly/monthly review object.

```
PeriodIntelligenceReview
  → toPersonalReportViewModel()   // field mapping only
  → InAppReportRenderer           // in-app
  → renderPeriodReportPdf()       // downloadable PDF
  → toPeriodReportEmailView()     // shorter email mapping
  → renderPeriodReportEmail()     // HTML + plain text

Email is built server-side from trusted stored state. Never send client JSON.
```

Do not recalculate intelligence in any renderer. Later weekly email, monthly email, and PDF should consume the same JSON without recalculating. Do not call `compareIntelligenceStates()`, Four Questions builders, Companion math, EODHD, or OpenAI from a renderer.

PDF generation is on-demand. Do not persist generated files.

## In-app

`InAppReportRenderer` consumes `PeriodIntelligenceReview` (via `toPersonalReportViewModel`). Presentation rules that differ by weekly vs monthly, or Free vs Complete, live in:

- `buildPeriodIntelligenceReview` / `buildPeriodReportPresentation` (canonical fields)
- `applyPeriodIntelligenceDepth` (Free vs Complete)
- `toPersonalReportViewModel` (evidence length, section order, accents)

React components in `components/report/` are presentational.

## PDF

`renderPeriodReportPdf(review)` maps the same view model into a printable PDF.

- Live weekly/monthly: POST `/api/review/pdf` with the already-built review.
- Archived monthly: GET `/api/review/monthly/[yearMonth]/pdf` builds the canonical object from the **saved** Companion snapshot only (`summarizeStoredChangeIntelligence([])`). Never mix live Change Intelligence into a historical month.
- Complete / Complete trial / active Demo: download allowed.
- Free: in-app report remains; PDF is gated with `period_briefings`.
- Demo payloads must not mix with personal access.

## Map

| Report block | Canonical field |
| --- | --- |
| Cover kicker (Your week / Your month) | `hero.kicker` |
| One conclusion | `hero.conclusion` / `headline` |
| Start → end / return tiles | `hero.metrics` (Companion-formatted strings) |
| At a glance (max 3) | `executiveSummary` |
| What happened | `happened` |
| What changed | `changed` |
| What matters now | `matters` |
| Am I on track? | `goal` |
| Looking ahead | `ahead` |
| Optional context | `context` — always use `channelLabel` |
| Data confidence | `confidence.notes` |
| Explore destinations | `explore` (in-app only) |

Skip a block when the field is `null` or an empty array. Do not invent copy.

## Free vs Complete

Call `applyPeriodIntelligenceDepth(review, access.intelligenceDepth)` once. Complete trial uses `"complete"`. Capability keys already in product access: `period_briefings`, `change_intelligence`.

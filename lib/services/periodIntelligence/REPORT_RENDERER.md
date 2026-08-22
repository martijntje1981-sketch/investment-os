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

`renderPeriodReportPdf(review)` is the **one canonical renderer** for new weekly/monthly downloads (Phase 19.2 premium layout). There is no second compact renderer for live reports.

Live path:

```
CompanionReviewPage
  → buildPeriodIntelligenceReview (+ buildPeriodReportBrief)
  → applyPeriodIntelligenceDepth("complete")
  → POST /api/review/pdf { review }
  → isPeriodIntelligenceReview
  → renderPeriodReportPdf(review)
```

The API route must not recalculate intelligence or pick a legacy layout. Optional `review.brief` (built in the composer) supplies cover metrics, charts, allocation, resilience, and holdings. Without `brief`, the same renderer still draws the Four Questions spine from canonical sections.

Archived monthly: GET `/api/review/monthly/[yearMonth]/pdf` rebuilds a canonical review from the **saved** Companion snapshot only (`holdings: []`). It uses the same renderer. Already-stored PDF bytes are not rewritten (this product does not persist generated files).

- Complete / Complete trial / active Demo: download allowed.
- Free: in-app report remains; PDF is gated with `period_briefings`.
- Demo payloads must not mix with personal access.

The previous compact layout lived in `renderPeriodReportPdf` itself (Phase 9B). Phase 19.2 replaced that function body in place. There is no remaining compact renderer module, and live Weekly/Monthly downloads must not select a compact fallback. Archived monthly PDFs are generated dynamically with the same function; they may be thinner when holdings are empty. This product does not persist generated PDF bytes, so already-downloaded files are unchanged.

PDF text uses Helvetica WinAnsi. `sanitizePdfText` maps separators (including middle dot) to ASCII hyphen, keeps Euro, and drops other unsupported characters instead of substituting `?`.

## Map

| Report block | Canonical field |
| --- | --- |
| Cover title (Your Weekly / Monthly Review) | `brief.coverTitle` / kind |
| Cover kicker (Your week / Your month) | `hero.kicker` |
| One conclusion | `hero.conclusion` / `headline` / `brief.headline` |
| Portfolio value / period change | labelled Companion period-end and **portfolio movement %** (`brief.periodEndValue`, `brief.periodChangePercent`). PERIOD CHANGE is not investment-return % and never the live snapshot |
| Current allocation / holdings / goal | `brief.currentPortfolioValue` with `brief.currentContextLabel` when later than the period-end |
| 30 seconds (max 3) | `brief.thirtySeconds` or `executiveSummary` |
| 01 What happened | `happened` + `changed` + performance/contributor charts |
| 02 What matters now | `matters` + `context` — always use `channelLabel` |
| 03 Am I on track? | `goal` + `brief.goal` (prompt when no goal; no fake chart) |
| 04 What's ahead | `ahead` + `brief.aheadItems` + modeled scenarios |
| Allocation | `brief.allocation` from Phase 17 `buildPortfolioExposureAllocation()` |
| Data confidence | `confidence.notes` + `brief.methodologyNotes` |
| Explore destinations | `explore` (in-app only) |

Skip a block when the field is `null` or an empty array. Do not invent copy.

## Free vs Complete

Call `applyPeriodIntelligenceDepth(review, access.intelligenceDepth)` once. Complete trial uses `"complete"`. Capability keys already in product access: `period_briefings`, `change_intelligence`.

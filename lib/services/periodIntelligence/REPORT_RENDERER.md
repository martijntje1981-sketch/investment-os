# PeriodIntelligenceReview — future renderer note

This object is the canonical weekly/monthly review. In-app Review already renders it. Later weekly email, monthly email, and PDF should consume the **same JSON** without recalculating intelligence.

## Do not recalculate

A renderer should not call `compareIntelligenceStates()`, Four Questions builders, EODHD, or OpenAI. It should receive a `PeriodIntelligenceReview` already produced by `buildPeriodIntelligenceReview` + `applyPeriodIntelligenceDepth`.

## Map

| Renderer field | Object field |
| --- | --- |
| Title (Your week / Your month) | `period.label` |
| One conclusion | `headline` |
| Short overview | `summary` |
| What happened | `happened` (omit if null) |
| What changed | `changed` |
| What matters | `matters` |
| Goal | `goal` |
| Looking ahead | `ahead` |
| Optional context (Complete only) | `context` — use `channelLabel` so news is never shown as a Perspective |
| Footer confidence | `confidence.notes` only when present |
| As-of | `dataAsOf` |

Each section is `{ title, headline, whyItMatters, evidence[] }`. Skip a section when the field is `null`. Do not invent copy for omitted sections.

## Free vs Complete

Call `applyPeriodIntelligenceDepth(review, access.intelligenceDepth)` once. Complete trial uses `"complete"`. Free keeps period performance + one change headline; exact deltas, resilience, context, and looking-ahead stay Complete.

## Honesty

`firstHistory` and `noMaterialChange` already carry the approved empty-state sentences. Never fill those with reconstructed history.

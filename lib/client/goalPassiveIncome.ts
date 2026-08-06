/**
 * Passive income target normalization for goals.
 * Blank and explicit 0 are valid; only positive values activate progress tracking.
 */

export function parseOptionalPassiveIncomeInput(
  raw: string,
): number | undefined {
  const trimmed = raw.replace(/,/g, ".").trim();

  if (trimmed === "" || trimmed === ".") {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  if (parsed < 0) {
    return undefined;
  }

  return parsed;
}

export function normalizePassiveIncomeTarget(
  value: unknown,
): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

export function hasPassiveIncomeTarget(
  value: number | null | undefined,
): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function passiveIncomeTargetForDatabase(
  value: number | undefined,
): number | null {
  return value === undefined ? null : value;
}

export function formatOptionalPassiveIncomeDisplay(
  value: number | undefined,
): string {
  if (value === undefined) {
    return "";
  }

  return String(value);
}

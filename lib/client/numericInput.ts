/**
 * Helpers for editable numeric fields: empty initial state, natural typing,
 * and parse-on-change without leading-zero artefacts.
 */

/** Allow digits and a single decimal separator while typing. */
export function sanitizeNumericInput(raw: string): string {
  let next = raw.replace(/,/g, ".").replace(/[^\d.]/g, "");
  const dotIndex = next.indexOf(".");

  if (dotIndex !== -1) {
    next =
      next.slice(0, dotIndex + 1) +
      next.slice(dotIndex + 1).replace(/\./g, "");
  }

  if (/^0[0-9]/.test(next)) {
    next = next.replace(/^0+/, "") || "0";
  }

  return next;
}

/** Parse user input to a number; empty field becomes 0 at validation time. */
export function parseNumericInput(raw: string): number {
  const trimmed = sanitizeNumericInput(raw.trim());

  if (trimmed === "" || trimmed === ".") {
    return 0;
  }

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Display value in an input; unset zero shows as empty with placeholder. */
export function formatNumericInputDisplay(value: number): string {
  if (!Number.isFinite(value) || value === 0) {
    return "";
  }

  return String(value);
}

/** Whether a sanitized string represents an explicit zero entry. */
export function isExplicitZeroInput(raw: string): boolean {
  const trimmed = sanitizeNumericInput(raw.trim());
  return trimmed === "0" || trimmed === "0.0" || trimmed === "0.00";
}

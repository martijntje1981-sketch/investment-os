/**
 * Helvetica text helpers for the period-report PDF encoder.
 * WinAnsiEncoding — Euro via standard encoding (code 128), no embedded fonts.
 */

/** Helvetica WinAnsi widths (units / 1000) for printable ASCII. */
const HELVETICA_ASCII_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278,
  278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584,
  584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556,
  833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278,
  278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222,
  500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500,
  500, 334, 260, 334, 584,
];

/** Helvetica AFM width for /Euro under WinAnsiEncoding. */
const EURO_WIDTH = 556;

export function sanitizePdfText(value: string): string {
  const folded = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u00A0\u202F\u2007\u2009\u200A]/g, " ")
    .replace(/[−–—‑‐·•∙●]/g, "-")
    .replace(/[→]/g, "->")
    .replace(/[←]/g, "<-")
    .replace(/[’‘‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, "...")
    .replace(/[×]/g, "x")
    .replace(/[≈]/g, "~")
    .replace(/[≤]/g, "<=")
    .replace(/[≥]/g, ">=");
  let out = "";
  for (const char of folded) {
    if (char === "€") {
      out += "€";
      continue;
    }
    const code = char.charCodeAt(0);
    if (code >= 0x20 && code <= 0x7e) {
      out += char;
    }
  }
  return out;
}

function glyphWidth(char: string): number {
  if (char === "€") return EURO_WIDTH;
  const charCode = char.charCodeAt(0);
  if (charCode < 32 || charCode > 126) return 556;
  return HELVETICA_ASCII_WIDTHS[charCode - 32] ?? 556;
}

export function measurePdfText(text: string, size: number): number {
  const sanitized = sanitizePdfText(text);
  let width = 0;
  for (const char of sanitized) {
    width += glyphWidth(char);
  }
  return (width * size) / 1000;
}

export function wrapPdfText(
  text: string,
  size: number,
  maxWidth: number,
): string[] {
  const sanitized = sanitizePdfText(text).replace(/\s+/g, " ").trim();
  if (!sanitized) return [];
  const words = sanitized.split(" ");
  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current) lines.push(current);
    current = "";
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measurePdfText(candidate, size) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (!current) {
      let chunk = "";
      for (const ch of word) {
        const next = chunk + ch;
        if (measurePdfText(next, size) <= maxWidth) {
          chunk = next;
        } else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      current = chunk;
      continue;
    }
    pushCurrent();
    if (measurePdfText(word, size) <= maxWidth) {
      current = word;
    } else {
      let chunk = "";
      for (const ch of word) {
        const next = chunk + ch;
        if (measurePdfText(next, size) <= maxWidth) {
          chunk = next;
        } else {
          if (chunk) lines.push(chunk);
          chunk = ch;
        }
      }
      current = chunk;
    }
  }
  pushCurrent();
  return lines;
}

export function countPdfPages(bytes: Uint8Array): number {
  const raw = Buffer.from(bytes).toString("latin1");
  const matches = raw.match(/\/Type \/Page\b/g) ?? [];
  return matches.length;
}

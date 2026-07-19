import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const DUTCH_UI_STRINGS = [
  "Gesloten",
  "Nog niet beschikbaar",
  "Bezig met vernieuwen",
  "Ten opzichte van het vorige beursslot",
  "Indicatieve handelsuren",
  "Laatste koersupdate",
  "Verenigde Staten",
  "Europa",
  "Markt gesloten",
  "Markt open",
  "Vandaag",
];

const UI_ROOTS = ["app", "components"];

function collectUiFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...collectUiFiles(fullPath));
      continue;
    }

    if (/\.(tsx|jsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

describe("english UI copy guard", () => {
  it("does not expose known Dutch UI strings in authenticated/public UI files", () => {
    const uiFiles = UI_ROOTS.flatMap((root) =>
      collectUiFiles(path.resolve(process.cwd(), root)),
    );

    const offenders: string[] = [];

    for (const file of uiFiles) {
      const source = readFileSync(file, "utf8");
      for (const phrase of DUTCH_UI_STRINGS) {
        if (source.includes(phrase)) {
          offenders.push(`${path.relative(process.cwd(), file)} -> ${phrase}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

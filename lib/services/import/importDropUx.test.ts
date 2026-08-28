import { readFileSync } from "node:fs";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  IMPORT_PDF_NOT_SUPPORTED_MESSAGE,
  IMPORT_SUPPORTED_FORMATS_HEADLINE,
} from "@/lib/services/import/importFormatCopy";
import { validateSpreadsheetImportFile } from "@/lib/services/import/spreadsheetParser";
import { preventBrowserFileNavigation } from "@/lib/client/usePreventBrowserFileNavigation";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Import UX — formats and drag/drop protection", () => {
  const upload = read("app/upload/page.tsx");
  const dropzone = read("components/import/ImportDropzone.tsx");
  const picker = read("components/import/ImportMethodPicker.tsx");
  const hook = read("lib/client/usePreventBrowserFileNavigation.ts");

  it("I. unsupported import type is rejected gracefully", () => {
    const pdf = validateSpreadsheetImportFile(
      new File(["x"], "statement.pdf", { type: "application/pdf" }),
    );
    expect(pdf.ok).toBe(false);
    expect(pdf.message).toBe(IMPORT_PDF_NOT_SUPPORTED_MESSAGE);

    const image = validateSpreadsheetImportFile(
      new File(["x"], "shot.png", { type: "image/png" }),
    );
    expect(image.ok).toBe(false);
    expect(image.message).toMatch(/Image files are not supported/i);

    expect(upload).toContain("validateSpreadsheetImportFile(file)");
    expect(upload).toContain("setPhase(\"choose\")");
  });

  it("J. drag/drop prevents browser navigation", () => {
    expect(hook).toContain('window.addEventListener("dragover"');
    expect(hook).toContain('window.addEventListener("drop"');
    expect(hook).toContain("event.preventDefault()");
    expect(upload).toContain("usePreventBrowserFileNavigation(phase === \"choose\")");
    expect(upload).toContain("preventBrowserFileNavigation(event)");
    const event = { preventDefaultCalled: false, preventDefault() { this.preventDefaultCalled = true; } };
    preventBrowserFileNavigation(event);
    expect(event.preventDefaultCalled).toBe(true);
  });

  it("K. supported file types are clearly presented", () => {
    expect(IMPORT_SUPPORTED_FORMATS_HEADLINE).toBe("CSV or Excel (.csv, .xlsx)");
    expect(dropzone).toContain("IMPORT_SUPPORTED_FORMATS_HEADLINE");
    expect(dropzone).toContain("IMPORT_SUPPORTED_FORMATS_DETAIL");
    expect(picker).toContain("Images and PDFs are not supported");
    expect(upload).toContain("import-supported-formats-banner");
    expect(upload).toContain("CSV or Excel (.csv, .xlsx)");
    expect(upload).toContain("Images and PDFs are not supported");
  });
});

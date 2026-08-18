import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  appControlDisabledClass,
  appFourQuestionAnswerClass,
  appHeroSecondaryButtonClass,
  appPageCanvasClass,
  appSecondaryButtonClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSolidButtonClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("shared readability tokens", () => {
  it("keeps a coherent type scale and prevents page overflow", () => {
    expect(appSectionLabelClass).toContain("text-[13px]");
    expect(appSectionMetaClass).toContain("text-[13px]");
    expect(appSectionBodyClass).toContain("text-[15px]");
    expect(appSectionBodyClass).toContain("sm:text-[16px]");
    expect(appFourQuestionAnswerClass).toContain("text-[1.125rem]");
    expect(appFourQuestionAnswerClass).toContain("sm:text-[1.25rem]");
    expect(appPageCanvasClass).toContain("overflow-x-clip");
    expect(appPageCanvasClass).toContain("max-w-full");
  });

  it("makes enabled secondary actions visible and disabled controls look disabled", () => {
    expect(appSecondaryButtonClass).toContain("border-slate-300");
    expect(appSecondaryButtonClass).toContain("bg-white");
    expect(appSecondaryButtonClass).toContain("text-slate-950");
    expect(appSecondaryButtonClass).toContain("text-[15px]");
    expect(appHeroSecondaryButtonClass).toContain("border-white/50");
    expect(appHeroSecondaryButtonClass).toContain("text-white");
    expect(appSolidButtonClass).toContain(appControlDisabledClass);
    expect(appSecondaryButtonClass).toContain(appControlDisabledClass);
    expect(appControlDisabledClass).toContain("disabled:opacity-50");
    expect(appControlDisabledClass).toContain("disabled:cursor-not-allowed");
    expect(appTextLinkClass).toContain("text-[15px]");
    expect(appTextLinkClass).toContain("min-h-[44px]");
  });

  it("wires Four Questions answers through the shared answer token", () => {
    const dashboard = read(
      "components/dashboard/fourQuestions/FourQuestionsSection.tsx",
    );
    const hub = read("components/fourQuestions/QuestionHubPage.tsx");
    expect(dashboard).toContain("appFourQuestionAnswerClass");
    expect(hub).toContain("appFourQuestionAnswerClass");
  });
});

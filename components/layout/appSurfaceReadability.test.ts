import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  appControlDisabledClass,
  appFourQuestionAnswerClass,
  appHeroPrimaryButtonClass,
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
    expect(appSectionLabelClass).toContain("text-slate-700");
    expect(appSectionMetaClass).toContain("text-[13px]");
    expect(appSectionMetaClass).toContain("text-slate-700");
    expect(appSectionBodyClass).toContain("text-[16px]");
    expect(appFourQuestionAnswerClass).toContain("text-[1.125rem]");
    expect(appFourQuestionAnswerClass).toContain("sm:text-[1.375rem]");
    expect(appPageCanvasClass).toContain("overflow-x-clip");
    expect(appPageCanvasClass).toContain("max-w-full");
  });

  it("makes enabled secondary actions visible and disabled controls look disabled", () => {
    expect(appSecondaryButtonClass).toContain("border-slate-300");
    expect(appSecondaryButtonClass).toContain("bg-white");
    expect(appSecondaryButtonClass).toContain("text-slate-950");
    expect(appSecondaryButtonClass).toContain("text-[16px]");
    expect(appHeroSecondaryButtonClass).toContain("border-white/50");
    expect(appHeroSecondaryButtonClass).toContain("text-white");
    expect(appHeroPrimaryButtonClass).toContain("bg-white");
    expect(appHeroPrimaryButtonClass).toContain("text-brand-navy");
    expect(appHeroPrimaryButtonClass).toContain("min-h-[44px]");
    expect(appSolidButtonClass).toContain(appControlDisabledClass);
    expect(appSecondaryButtonClass).toContain(appControlDisabledClass);
    expect(appControlDisabledClass).toContain("disabled:opacity-50");
    expect(appControlDisabledClass).toContain("disabled:cursor-not-allowed");
    expect(appTextLinkClass).toContain("text-[16px]");
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

  it("keeps Goals reality-check copy on the body token", () => {
    const goals = read("components/goals/GoalRealityCheckPanel.tsx");
    expect(goals).toContain("appSectionBodyClass");
    expect(goals).not.toMatch(/text-\[1[12]px\]/);
  });

  it("keeps What-if explanations and limitations on the body token", () => {
    const explorer = read("components/goals/WhatIfExplorer.tsx");
    expect(explorer).toContain("appSectionBodyClass");
    expect(explorer).toContain("min-h-11");
    expect(explorer).toContain("break-words");
    expect(explorer).not.toMatch(/text-\[1[012]px\]/);
    expect(explorer).not.toMatch(/overflow-x-auto|overflow-x-scroll/);
  });

  it("keeps Four Questions hub evidence on the readable answer scale", () => {
    const hub = read("components/fourQuestions/QuestionHubPage.tsx");
    expect(hub).toContain("text-[16px]");
    expect(hub).not.toContain('text-[10px] font-bold uppercase tracking-[0.12em]');
  });

  it("keeps news compact metadata at the 13px floor", () => {
    const news = read("components/news/newsCardStyles.ts");
    expect(news).toContain("text-[13px]");
    expect(news).not.toMatch(/newsCompactMetaClass[\s\S]*text-xs/);
  });

  it("exposes a clearly visible Four Questions semantic identity", () => {
    const identity = read("components/layout/semanticIdentity.ts");
    expect(identity).toContain("border-2 border-cyan-300");
    expect(identity).toContain("border-2 border-violet-300");
    expect(identity).toContain("border-2 border-amber-300");
    expect(identity).toContain("border-2 border-teal-300");
    expect(identity).toContain("bg-cyan-600");
    expect(identity).toContain("text-emerald-600");
    expect(identity).toContain("text-rose-600");
  });
});

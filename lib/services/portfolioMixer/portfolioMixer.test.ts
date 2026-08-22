import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { STANCE_PROHIBITED_PATTERNS } from "@/lib/services/portfolioStance/wording";
import {
  EXAMPLE_MIXER_ALLOCATION,
  isMixerAllocationValid,
  MIXER_CTA_HREF,
  MIXER_CTA_LABEL,
  MIXER_EVENTS,
  MIXER_SLEEVE_IDS,
  mixerAllocationTotal,
  parseMixerAllocation,
  serializeMixerAllocation,
  setMixerSleeve,
} from "@/lib/services/portfolioMixer";
import { buildMixerIntelligence } from "@/lib/services/portfolioMixer/intelligence";
import type { MixerAllocation } from "@/lib/services/portfolioMixer/types";

const MIXER_PROHIBITED = [
  ...STANCE_PROHIBITED_PATTERNS,
  /\brecommended allocation\b/i,
  /\boptimal portfolio\b/i,
  /\bideal\b/i,
  /\bsuitable\b/i,
  /\byou should\b/i,
  /\breduce\b/i,
  /\bincrease\b/i,
];

function mix(partial: Partial<MixerAllocation>): MixerAllocation {
  return { ...EXAMPLE_MIXER_ALLOCATION, ...partial };
}

function allCopy(allocation: MixerAllocation): string {
  const result = buildMixerIntelligence(allocation);
  return [
    result.stance,
    result.stanceBandLabel,
    result.disclaimer,
    ...result.insights.flatMap((insight) => [insight.label, insight.body]),
  ].join("\n");
}

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Portfolio Mixer allocation", () => {
  it("starts from an example mix that totals 100, without advisory framing", () => {
    expect(isMixerAllocationValid(EXAMPLE_MIXER_ALLOCATION)).toBe(true);
    expect(mixerAllocationTotal(EXAMPLE_MIXER_ALLOCATION)).toBe(100);
    const source = read("lib/services/portfolioMixer/allocation.ts");
    expect(source).toMatch(/Illustrative starting mix only/);
    expect(source).not.toMatch(/\brecommended\b/i);
  });

  it("keeps the mix at exactly 100% after any slider move (F)", () => {
    let current = EXAMPLE_MIXER_ALLOCATION;
    const moves = [0, 1, 17, 33, 50, 66, 80, 99, 100, 40, 12];
    for (const sleeve of MIXER_SLEEVE_IDS) {
      for (const value of moves) {
        current = setMixerSleeve(current, sleeve, value);
        expect(isMixerAllocationValid(current)).toBe(true);
        expect(mixerAllocationTotal(current)).toBe(100);
        expect(current[sleeve]).toBe(value);
      }
    }
  });

  it("handles 0% and 100% extremes without invalid totals (G)", () => {
    const allStocks = setMixerSleeve(EXAMPLE_MIXER_ALLOCATION, "stocks", 100);
    expect(allStocks).toEqual({
      stocks: 100,
      bonds: 0,
      bitcoin: 0,
      other_crypto: 0,
      commodities: 0,
      cash: 0,
    });
    expect(isMixerAllocationValid(allStocks)).toBe(true);

    const fromZeroOthers = setMixerSleeve(allStocks, "stocks", 80);
    expect(fromZeroOthers.stocks).toBe(80);
    expect(mixerAllocationTotal(fromZeroOthers)).toBe(100);
    expect(isMixerAllocationValid(fromZeroOthers)).toBe(true);

    const noCash = setMixerSleeve(EXAMPLE_MIXER_ALLOCATION, "cash", 0);
    expect(noCash.cash).toBe(0);
    expect(mixerAllocationTotal(noCash)).toBe(100);
  });

  it("clamps out-of-range slider values", () => {
    const high = setMixerSleeve(EXAMPLE_MIXER_ALLOCATION, "bonds", 140);
    expect(high.bonds).toBe(100);
    expect(mixerAllocationTotal(high)).toBe(100);
    const low = setMixerSleeve(EXAMPLE_MIXER_ALLOCATION, "bonds", -20);
    expect(low.bonds).toBe(0);
    expect(mixerAllocationTotal(low)).toBe(100);
  });

  it("round-trips a valid mix for later onboarding continuity", () => {
    const raw = serializeMixerAllocation(EXAMPLE_MIXER_ALLOCATION);
    expect(parseMixerAllocation(raw)).toEqual(EXAMPLE_MIXER_ALLOCATION);
    expect(parseMixerAllocation('{"stocks":40}')).toBeNull();
  });
});

describe("Portfolio Mixer intelligence", () => {
  it("identifies equity/growth dominance (A)", () => {
    const result = buildMixerIntelligence(
      mix({
        stocks: 80,
        bonds: 10,
        bitcoin: 0,
        other_crypto: 0,
        commodities: 0,
        cash: 10,
      }),
    );
    expect(result.stance).toBe("Offensive");
    expect(result.dominantEconomicSleeve).toBe("stocks");
    expect(result.insights[0].body.toLowerCase()).toMatch(/growth|risk/);
    expect(result.insights[1].body.toLowerCase()).toMatch(/stocks/);
  });

  it("identifies crypto sensitivity without moral judgement (B)", () => {
    const result = buildMixerIntelligence(
      mix({
        stocks: 10,
        bonds: 5,
        bitcoin: 50,
        other_crypto: 25,
        commodities: 5,
        cash: 5,
      }),
    );
    expect(result.stance).toBe("Offensive");
    expect(result.cryptoClusterPercent).toBe(75);
    expect(result.insights[1].body).toMatch(/Bitcoin and other crypto/);
    expect(result.insights[1].body.toLowerCase()).not.toMatch(
      /reckless|irresponsible|gambling|foolish/,
    );
  });

  it("lets bonds and cash pull stance defensive (C)", () => {
    const result = buildMixerIntelligence(
      mix({
        stocks: 10,
        bonds: 45,
        bitcoin: 0,
        other_crypto: 0,
        commodities: 5,
        cash: 40,
      }),
    );
    expect(result.stance).toBe("Defensive");
    expect(result.defensivePercent).toBe(85);
    expect(
      result.insights.some((insight) =>
        /bonds and cash/i.test(`${insight.label} ${insight.body}`),
      ),
    ).toBe(true);
  });

  it("does not invent a dominant sleeve for a diversified mix (D)", () => {
    const result = buildMixerIntelligence(
      mix({
        stocks: 25,
        bonds: 20,
        bitcoin: 10,
        other_crypto: 5,
        commodities: 20,
        cash: 20,
      }),
    );
    expect(result.dominantEconomicSleeve).toBeNull();
    expect(result.concentrated).toBe(false);
    expect(result.distinctEconomicSleeves).toBeGreaterThanOrEqual(4);
    expect(result.insights[1].body).toMatch(/No single sleeve/);
  });

  it("recognises clear concentration (E)", () => {
    const result = buildMixerIntelligence(
      mix({
        stocks: 90,
        bonds: 5,
        bitcoin: 0,
        other_crypto: 0,
        commodities: 0,
        cash: 5,
      }),
    );
    expect(result.concentrated).toBe(true);
    expect(result.dominantEconomicSleeve).toBe("stocks");
    expect(result.insights[2].body).toMatch(/concentrated in stocks/);
  });

  it("treats Bitcoin + Other Crypto as one family, not diversification", () => {
    const split = buildMixerIntelligence(
      mix({
        stocks: 52,
        bonds: 0,
        bitcoin: 24,
        other_crypto: 24,
        commodities: 0,
        cash: 0,
      }),
    );
    expect(split.cryptoClusterPercent).toBe(48);
    expect(split.distinctEconomicSleeves).toBe(2);
    expect(split.insights.some((insight) => /one risk family/i.test(insight.body))).toBe(
      true,
    );

    const concentrated = buildMixerIntelligence(
      mix({
        stocks: 40,
        bonds: 0,
        bitcoin: 30,
        other_crypto: 30,
        commodities: 0,
        cash: 0,
      }),
    );
    expect(concentrated.cryptoClusterPercent).toBe(60);
    expect(concentrated.concentrated).toBe(true);
    expect(concentrated.insights[2].body).toMatch(/Bitcoin and other crypto/);
    expect(concentrated.insights[2].body.toLowerCase()).not.toMatch(
      /several meaningfully different/,
    );
  });

  it("handles 0% and 100% mixes safely (G)", () => {
    const cashOnly = buildMixerIntelligence(
      mix({
        stocks: 0,
        bonds: 0,
        bitcoin: 0,
        other_crypto: 0,
        commodities: 0,
        cash: 100,
      }),
    );
    expect(cashOnly.stance).toBe("Defensive");
    expect(cashOnly.total).toBe(100);

    const bitcoinOnly = buildMixerIntelligence(
      mix({
        stocks: 0,
        bonds: 0,
        bitcoin: 100,
        other_crypto: 0,
        commodities: 0,
        cash: 0,
      }),
    );
    expect(bitcoinOnly.stance).toBe("Offensive");
    expect(bitcoinOnly.cryptoClusterPercent).toBe(100);
  });

  it("contains no prescriptive buy/sell/rebalance language (H)", () => {
    const fixtures: MixerAllocation[] = [
      EXAMPLE_MIXER_ALLOCATION,
      mix({
        stocks: 80,
        bonds: 10,
        bitcoin: 0,
        other_crypto: 0,
        commodities: 0,
        cash: 10,
      }),
      mix({
        stocks: 10,
        bonds: 5,
        bitcoin: 50,
        other_crypto: 25,
        commodities: 5,
        cash: 5,
      }),
      mix({
        stocks: 10,
        bonds: 45,
        bitcoin: 0,
        other_crypto: 0,
        commodities: 5,
        cash: 40,
      }),
      mix({
        stocks: 25,
        bonds: 20,
        bitcoin: 10,
        other_crypto: 5,
        commodities: 20,
        cash: 20,
      }),
      mix({
        stocks: 90,
        bonds: 5,
        bitcoin: 0,
        other_crypto: 0,
        commodities: 0,
        cash: 5,
      }),
      mix({
        stocks: 0,
        bonds: 0,
        bitcoin: 100,
        other_crypto: 0,
        commodities: 0,
        cash: 0,
      }),
      mix({
        stocks: 0,
        bonds: 0,
        bitcoin: 0,
        other_crypto: 0,
        commodities: 0,
        cash: 100,
      }),
    ];

    for (const allocation of fixtures) {
      const blob = allCopy(allocation);
      for (const pattern of MIXER_PROHIBITED) {
        expect(blob).not.toMatch(pattern);
      }
    }
  });

  it("keeps stance descriptive and uses the existing trial CTA", () => {
    expect(MIXER_CTA_HREF).toBe("/signup?intent=trial&from=mixer");
    expect(MIXER_CTA_LABEL).toMatch(/real portfolio/i);
    expect(MIXER_EVENTS.viewed).toBe("mixer_viewed");
    expect(buildMixerIntelligence(EXAMPLE_MIXER_ALLOCATION).disclaimer).toMatch(
      /not whether it is good or bad/i,
    );
  });
});

describe("Portfolio Mixer homepage and existing-user navigation", () => {
  it("places the Mixer on the public homepage and connects Four Questions without fake answers", () => {
    const home = read("app/page.tsx");
    const mixer = read("components/marketing/PublicPortfolioMixer.tsx");
    expect(home).toContain("PublicPortfolioMixer");
    expect(home).toContain("#portfolio-mixer");
    expect(mixer).toContain('id="portfolio-mixer"');
    expect(mixer).toContain("FOUR_QUESTIONS");
    expect(mixer).toContain("MIXER_CTA_HREF");
    expect(mixer).not.toMatch(/What happened to your mixer/i);
    expect(mixer).not.toMatch(/fake|invented answer/i);
  });

  it("exposes Sign in on desktop and mobile marketing chrome (I, J)", () => {
    const header = read("components/marketing/MarketingHeader.tsx");
    expect(header).toContain('href="/login"');
    expect(header).toContain("Sign in");
    expect(header).not.toContain(">Log in<");
    expect(header).toContain("mobile-signin");
    expect(header).toContain("desktop-signin");
    expect(header).toContain("lg:hidden");
    expect(header).toContain("Open Tobailey");
    expect(header).toContain("/dashboard");
  });
});

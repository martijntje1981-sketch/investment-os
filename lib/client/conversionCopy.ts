/**
 * Shared conversion copy for guest and zero-holdings surfaces.
 * Keep usage restrained — one card per page, never disruptive popups.
 */

export const CONVERSION_COPY = {
  headline: "Make Tobailey yours",
  supporting:
    "Explore general market intelligence now. Sign in and add your holdings to unlock personalized insights, portfolio analysis and relevant market context.",
  primaryCta: "Add your holdings",
  secondaryCta: "Sign in to personalize",
  softLine:
    "General market intelligence is available to everyone. Personal insights begin when you add your holdings.",
  holdingsRequiredBody:
    "Add your first investment to start your personal Tobailey briefing.",
  zeroHoldingsHeroTitle: "Add your first investment",
  zeroHoldingsHeroCopy:
    "Upload a file or add a few holdings to start your personal Tobailey briefing.",
  zeroHoldingsPrimaryCta: "Upload portfolio",
  zeroHoldingsSecondaryCta: "Add manually",
  primaryHref: "/upload",
  secondaryGuestHref: "/login",
  exploreHref: "/explore",
  manualAddHref: "/portfolio?add=investment",
} as const;

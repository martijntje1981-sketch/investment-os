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
    "Add your holdings to unlock portfolio analysis, relevance and tailored insights.",
  zeroHoldingsHeroTitle: "Welcome to Tobailey",
  zeroHoldingsHeroCopy:
    "You can already explore market intelligence. Add your holdings to unlock your personal investment command centre.",
  zeroHoldingsPrimaryCta: "Add my holdings",
  zeroHoldingsSecondaryCta: "Explore the market",
  primaryHref: "/upload",
  secondaryGuestHref: "/login",
  exploreHref: "/explore",
  manualAddHref: "/portfolio?add=investment",
} as const;

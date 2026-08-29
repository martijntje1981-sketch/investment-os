import { PRODUCT_MODEL_TRIAL_HREF } from "@/lib/content/productModels";

/**
 * Analytics-ready event names. No provider is wired in Step 1.
 * Attach as `data-analytics` and call `emitMixerEvent` so a later
 * collector can subscribe without changing Mixer logic.
 */
export const MIXER_EVENTS = {
  viewed: "mixer_viewed",
  firstInteraction: "mixer_first_interaction",
  resultViewed: "mixer_result_viewed",
  ctaClicked: "mixer_cta_clicked",
  trialStarted: "trial_started",
  onboardingCompleted: "onboarding_completed",
} as const;

export type MixerEventName = (typeof MIXER_EVENTS)[keyof typeof MIXER_EVENTS];

export const MIXER_CTA_HREF = `${PRODUCT_MODEL_TRIAL_HREF}&from=mixer` as const;

export const MIXER_CTA_LABEL = "See what this means for your real portfolio";

export function emitMixerEvent(
  name: MixerEventName,
  detail?: Record<string, string | number | boolean>,
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("tobailey:mixer", { detail: { name, ...detail } }),
  );
}

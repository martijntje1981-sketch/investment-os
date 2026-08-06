import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  MAGIC_LINK_CROSS_BROWSER_COPY,
  MAGIC_LINK_NEWEST_ONLY_WARNING,
  MAGIC_LINK_RATE_LIMIT_MESSAGE,
  MAGIC_LINK_RESEND_COOLDOWN_SECONDS,
  buildExploreMagicLinkRecoveryPath,
  classifyMagicLinkCallbackError,
  classifyMagicLinkSendError,
  formatMagicLinkCooldownMessage,
  magicLinkCallbackUserMessage,
  parseMagicLinkAuthErrorParam,
} from "@/lib/auth/magicLinkErrors";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("magicLinkErrors", () => {
  it("classifies expired and already-used callback failures", () => {
    expect(classifyMagicLinkCallbackError("otp_expired")).toBe("expired");
    expect(
      classifyMagicLinkCallbackError("Email link is invalid or has expired"),
    ).toBe("expired");
    expect(
      classifyMagicLinkCallbackError("Token has already been used"),
    ).toBe("already_used");
    expect(magicLinkCallbackUserMessage("already_used")).toContain(
      "already used",
    );
  });

  it("classifies missing params and invalid verification links", () => {
    expect(classifyMagicLinkCallbackError("missing_auth_params")).toBe(
      "missing",
    );
    expect(classifyMagicLinkCallbackError(null)).toBe("missing");
    expect(classifyMagicLinkCallbackError("Invalid JWT")).toBe("invalid");
    expect(
      classifyMagicLinkCallbackError("session_not_established"),
    ).toBe("invalid");
  });

  it("maps rate-limit send errors without auto-retry wording", () => {
    const mapped = classifyMagicLinkSendError("rate limit exceeded", {
      status: 429,
    });
    expect(mapped.kind).toBe("rate_limited");
    expect(mapped.message).toBe(MAGIC_LINK_RATE_LIMIT_MESSAGE);
    expect(
      classifyMagicLinkCallbackError("For security purposes, you can only request this after 60 seconds."),
    ).toBe("rate_limited");
  });

  it("formats the resend cooldown countdown", () => {
    expect(formatMagicLinkCooldownMessage(45)).toBe(
      "You can request another link in 45 seconds.",
    );
    expect(MAGIC_LINK_RESEND_COOLDOWN_SECONDS).toBe(45);
  });

  it("builds explore recovery paths from auth_error codes", () => {
    expect(buildExploreMagicLinkRecoveryPath("expired")).toBe(
      "/explore?auth_error=expired",
    );
    expect(parseMagicLinkAuthErrorParam("already_used")).toBe("already_used");
    expect(parseMagicLinkAuthErrorParam("nope")).toBeNull();
  });
});

describe("magic-link onboarding UX wiring", () => {
  const explore = read("app/explore/page.tsx");
  const callback = read("app/auth/callback/route.ts");
  const otpErrors = read("lib/services/examplePortfolio/otpErrors.ts");
  const start = read("lib/services/examplePortfolio/startExamplePortfolio.ts");

  it("shows success state, cross-browser copy, and resend cooldown on Explore", () => {
    expect(explore).toContain("Check your email to continue.");
    expect(explore).toContain("MAGIC_LINK_CROSS_BROWSER_COPY");
    expect(explore).toContain("MAGIC_LINK_NEWEST_ONLY_WARNING");
    expect(MAGIC_LINK_CROSS_BROWSER_COPY).toContain("same browser");
    expect(explore).toContain("formatMagicLinkCooldownMessage");
    expect(explore).toContain("MAGIC_LINK_RESEND_COOLDOWN_SECONDS");
    expect(explore).toContain("Send a new login link");
    expect(explore).toContain("Back to sign in");
    expect(explore).toContain("disabled={requestDisabled}");
    expect(explore).toContain("Sending link");
    expect(explore).toContain("requestDisabled");
  });

  it("recovers from callback failures without redirect loops", () => {
    expect(callback).toContain("buildExploreMagicLinkRecoveryPath");
    expect(callback).toContain("classifyMagicLinkCallbackError");
    expect(callback).toContain('redirectWithCookies("/dashboard"');
    expect(callback).not.toContain(
      "The sign-in link is invalid or expired. Request a new one.",
    );
    expect(explore).toContain("parseMagicLinkAuthErrorParam");
    expect(explore).toContain('view === "recovery"');
    expect(explore).toContain("auth_error");
  });

  it("reuses shared send-error mapping for rate limits", () => {
    expect(otpErrors).toContain("classifyMagicLinkSendError");
    expect(start).toContain("mapExampleOtpError");
    expect(explore).toContain("MAGIC_LINK_RATE_LIMIT_MESSAGE");
    expect(explore).toContain("MAGIC_LINK_RATE_LIMIT_COOLDOWN_SECONDS");
    expect(MAGIC_LINK_NEWEST_ONLY_WARNING).toContain("newest");
  });
});

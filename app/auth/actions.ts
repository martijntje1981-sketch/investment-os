"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { buildSignupUserMetadata } from "@/lib/types/portfolioBaseCurrency";
import { safeAuthRedirectPath } from "@/lib/auth/routeAccess";
import {
  buildAuthCallbackUrl,
  buildPersonalTrialAuthCallbackUrl,
  getPublicSiteUrl,
} from "@/lib/auth/siteUrl";
import { reserveExampleEntitlement } from "@/lib/services/examplePortfolio/entitlements";
import { normalizeExampleEmail } from "@/lib/services/examplePortfolio/types";

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    redirectWithError("/login", "Enter your email address and password.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirectWithError("/login", "The email address or password is incorrect.");
  }

  redirect(safeAuthRedirectPath(nextRaw, "/dashboard"));
}

export async function signup(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const acceptedTerms = formData.get("terms") === "on";
  const baseCurrencyRaw = formData.get("baseCurrency");

  if (!name || !email || !password) {
    redirectWithError("/signup", "Complete all required fields.");
  }

  if (password.length < 8) {
    redirectWithError("/signup", "Use a password of at least 8 characters.");
  }

  if (password !== confirmPassword) {
    redirectWithError("/signup", "The passwords do not match.");
  }

  if (!acceptedTerms) {
    redirectWithError("/signup", "Accept the Terms and Privacy Policy to continue.");
  }

  const requestHeaders = await headers();
  const siteUrl = getPublicSiteUrl(requestHeaders);
  const nextRaw = String(formData.get("next") ?? "").trim();
  const intent = String(formData.get("intent") ?? "").trim();
  const isPersonalTrial = intent === "trial";
  const safeNext = safeAuthRedirectPath(nextRaw, "/dashboard");
  const supabase = await createClient();
  const userMetadata = {
    ...buildSignupUserMetadata({
      fullName: name,
      baseCurrency: baseCurrencyRaw,
    }),
    ...(isPersonalTrial ? { pending_personal_trial: true } : {}),
  };

  // Reserve trial entitlement without seeding — activation starts the clock only.
  if (isPersonalTrial) {
    const admin = createAdminClient();
    if (admin) {
      try {
        await reserveExampleEntitlement(admin, {
          email: normalizeExampleEmail(email),
          template: "global",
        });
      } catch {
        // Signup still proceeds; Activator / callback can retry reservation later.
      }
    }
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userMetadata,
      emailRedirectTo: isPersonalTrial
        ? buildPersonalTrialAuthCallbackUrl(siteUrl, safeNext)
        : buildAuthCallbackUrl(siteUrl, safeNext),
    },
  });

  if (error) {
    redirectWithError("/signup", error.message);
  }

  redirect(
    "/login?message=" +
      encodeURIComponent("Check your email to confirm your account, then sign in.") +
      `&next=${encodeURIComponent(safeNext)}`,
  );
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirectWithError("/forgot-password", "Enter your email address.");
  }

  const requestHeaders = await headers();
  const siteUrl = getPublicSiteUrl(requestHeaders);
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildAuthCallbackUrl(siteUrl, "/reset-password"),
  });

  if (error) {
    redirectWithError(
      "/forgot-password",
      "We could not send the reset email. Please try again.",
    );
  }

  redirect(
    "/forgot-password?message=" +
      encodeURIComponent(
        "If an account exists for this email address, a password reset link has been sent.",
      ),
  );
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    redirectWithError(
      "/reset-password",
      "Use a password of at least 8 characters.",
    );
  }

  if (password !== confirmPassword) {
    redirectWithError("/reset-password", "The passwords do not match.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirectWithError(
      "/reset-password",
      "The reset session is invalid or expired. Request a new reset link.",
    );
  }

  await supabase.auth.signOut();
  redirect(
    "/login?message=" +
      encodeURIComponent("Your password has been updated. You can now sign in."),
  );
}

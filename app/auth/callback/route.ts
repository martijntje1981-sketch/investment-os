import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  buildExploreMagicLinkRecoveryPath,
  classifyMagicLinkCallbackError,
} from "@/lib/auth/magicLinkErrors";
import { safeAuthRedirectPath } from "@/lib/auth/routeAccess";
import { activateExamplePortfolioForUser } from "@/lib/services/examplePortfolio/activate";
import { createAdminClient } from "@/lib/supabase/admin";

type EmailOtpType =
  "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

type BufferedCookie = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

function exploreErrorRedirect(
  origin: string,
  message: string,
  cookies: BufferedCookie[],
) {
  const response = NextResponse.redirect(
    new URL(`/explore?error=${encodeURIComponent(message)}`, origin),
  );
  cookies.forEach(({ name, value, options }) => {
    response.cookies.set(
      name,
      value,
      options as Parameters<typeof response.cookies.set>[2],
    );
  });
  return response;
}

function redirectWithCookies(
  path: string,
  origin: string,
  cookies: BufferedCookie[],
) {
  const response = NextResponse.redirect(new URL(path, origin));
  cookies.forEach(({ name, value, options }) => {
    response.cookies.set(
      name,
      value,
      options as Parameters<typeof response.cookies.set>[2],
    );
  });
  return response;
}

/**
 * Auth callback for magic links / email confirmation.
 *
 * Critical: session cookies must be written onto the redirect response.
 * Next.js 15 does not reliably propagate cookies().set() onto a later
 * NextResponse.redirect(), which previously left users on `/` unauthenticated.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next");
  const exampleParam = url.searchParams.get("example");
  const trialParam = url.searchParams.get("trial");
  const safeNext = safeAuthRedirectPath(next, "/dashboard");

  const cookieBuffer: BufferedCookie[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            const index = cookieBuffer.findIndex((c) => c.name === name);
            const entry = {
              name,
              value,
              options: options as Record<string, unknown>,
            };
            if (index >= 0) cookieBuffer[index] = entry;
            else cookieBuffer.push(entry);
          });
        },
      },
    },
  );

  let sessionError: string | null = null;
  /** User from a successful code/OTP exchange — prefer over any prior cookie session. */
  let exchangedUser: Awaited<
    ReturnType<typeof supabase.auth.getUser>
  >["data"]["user"] = null;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) sessionError = error.message;
    else if (!data.session?.user) sessionError = "session_not_established";
    else exchangedUser = data.session.user;
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (error) sessionError = error.message;
    else if (!data.session?.user) sessionError = "session_not_established";
    else exchangedUser = data.session.user;
  } else {
    sessionError = "missing_auth_params";
  }

  if (sessionError) {
    const kind = classifyMagicLinkCallbackError(sessionError);
    const wantsExample = exampleParam === "1";
    return wantsExample
      ? redirectWithCookies(
          buildExploreMagicLinkRecoveryPath(kind),
          origin,
          cookieBuffer,
        )
      : redirectWithCookies(
          `/login?auth_error=${encodeURIComponent(kind)}&error=${encodeURIComponent(
            kind === "expired"
              ? "This confirmation link has expired. Request a new sign-in link from Explore or sign up again."
              : "This confirmation link is invalid or was already used. Request a new one if you still need access.",
          )}&next=${encodeURIComponent(safeNext)}`,
          origin,
          cookieBuffer,
        );
  }

  // Never activate against a pre-existing cookie session when the link exchange
  // did not establish the email-link user (that miss-looked-up the wrong email).
  const user = exchangedUser;
  if (!user) {
    const kind = classifyMagicLinkCallbackError("session_not_established");
    return exampleParam === "1"
      ? redirectWithCookies(
          buildExploreMagicLinkRecoveryPath(kind),
          origin,
          cookieBuffer,
        )
      : redirectWithCookies(
          `/login?auth_error=${encodeURIComponent(kind)}&error=${encodeURIComponent(
            "Could not verify your email. Request a new link if you still need access.",
          )}&next=${encodeURIComponent(safeNext)}`,
          origin,
          cookieBuffer,
        );
  }

  const admin = createAdminClient();

  // Explicit intents only — never auto-activate solely because a reserved
  // entitlement row exists (that previously seeded demo data onto trial signups).
  const wantsDemoPortfolio = exampleParam === "1";
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const wantsPersonalTrial =
    trialParam === "1" || metadata.pending_personal_trial === true;

  if (wantsDemoPortfolio || wantsPersonalTrial) {
    if (!admin) {
      return exploreErrorRedirect(
        origin,
        wantsDemoPortfolio
          ? "Example portfolios are temporarily unavailable."
          : "Trial signup is temporarily unavailable.",
        cookieBuffer,
      );
    }

    try {
      const result = await activateExamplePortfolioForUser({
        admin,
        userClient: supabase,
        user,
        forceFromCallback: true,
        seedHoldings: wantsDemoPortfolio,
      });

      if (result.status === "expired") {
        return redirectWithCookies("/example-expired", origin, cookieBuffer);
      }

      if (result.status === "error") {
        return exploreErrorRedirect(origin, result.message, cookieBuffer);
      }

      if (result.status === "skipped") {
        // Only this copy when there is genuinely no reserved row for the
        // authenticated email (or no activation intent on that row).
        const missingChoice =
          result.reason === "No reserved example portfolio." ||
          result.reason === "No example activation intent for this session.";
        if (wantsDemoPortfolio) {
          return exploreErrorRedirect(
            origin,
            missingChoice
              ? "Could not find your example portfolio choice. Start again from Explore."
              : "Could not activate your example portfolio. Try again.",
            cookieBuffer,
          );
        }
        // Personal trial without a reserved row still reaches onboarding empty.
        const destination = safeNext === "/" ? "/dashboard" : safeNext;
        return redirectWithCookies(destination, origin, cookieBuffer);
      }

      // activated | already_active | converted → always Dashboard (never `/`).
      return redirectWithCookies("/dashboard", origin, cookieBuffer);
    } catch {
      return exploreErrorRedirect(
        origin,
        wantsDemoPortfolio
          ? "Could not activate your example portfolio. Try again."
          : "Could not start your trial. Try again.",
        cookieBuffer,
      );
    }
  }

  // Normal (non-example) auth callback — never land successful auth on `/`.
  const destination = safeNext === "/" ? "/dashboard" : safeNext;
  return redirectWithCookies(destination, origin, cookieBuffer);
}

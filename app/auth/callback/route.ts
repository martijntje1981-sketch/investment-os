import { NextResponse } from "next/server";

import { safeAuthRedirectPath } from "@/lib/auth/routeAccess";
import { activateExamplePortfolioForUser } from "@/lib/services/examplePortfolio/activate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const example = url.searchParams.get("example");
  const safeNext = safeAuthRedirectPath(next, "/dashboard");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (example === "1") {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const admin = createAdminClient();

        if (!user) {
          return NextResponse.redirect(
            new URL(
              "/explore?error=Could not verify your email. Try again.",
              url.origin,
            ),
          );
        }

        if (!admin) {
          return NextResponse.redirect(
            new URL(
              "/explore?error=Example portfolios are temporarily unavailable.",
              url.origin,
            ),
          );
        }

        try {
          const result = await activateExamplePortfolioForUser({
            admin,
            userClient: supabase,
            user,
          });

          if (result.status === "expired") {
            return NextResponse.redirect(
              new URL("/example-expired", url.origin),
            );
          }

          if (result.status === "converted") {
            return NextResponse.redirect(new URL("/dashboard", url.origin));
          }

          if (result.status === "error") {
            return NextResponse.redirect(
              new URL(
                `/explore?error=${encodeURIComponent(result.message)}`,
                url.origin,
              ),
            );
          }

          // activated | already_active | skipped → continue to app
          return NextResponse.redirect(new URL(safeNext, url.origin));
        } catch {
          return NextResponse.redirect(
            new URL(
              "/explore?error=Could not activate your example portfolio. Try again.",
              url.origin,
            ),
          );
        }
      }

      return NextResponse.redirect(new URL(safeNext, url.origin));
    }
  }

  const loginError =
    example === "1"
      ? "/explore?error=The sign-in link is invalid or expired. Request a new one."
      : "/login?error=The confirmation link is invalid or expired.";

  return NextResponse.redirect(new URL(loginError, url.origin));
}

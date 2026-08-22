import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import {
  isAuthRequiredPath,
  safeAuthRedirectPath,
  shouldBlockExpiredExampleUser,
} from "@/lib/auth/routeAccess";
import type { ExamplePortfolioUserMetadata } from "@/lib/services/examplePortfolio/types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isProtected = isAuthRequiredPath(pathname);

  if (isProtected && !data.user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (data.user) {
    const meta = (data.user.user_metadata ??
      {}) as ExamplePortfolioUserMetadata;

    if (
      shouldBlockExpiredExampleUser({
        pathname,
        userMetadata: meta,
      })
    ) {
      const expiredUrl = request.nextUrl.clone();
      expiredUrl.pathname = "/example-expired";
      expiredUrl.search = "";
      return NextResponse.redirect(expiredUrl);
    }
  }

  if (data.user && (pathname === "/login" || pathname === "/signup")) {
    const nextParam = request.nextUrl.searchParams.get("next");
    const destination = safeAuthRedirectPath(nextParam, "/dashboard");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = destination;
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

import { NextResponse } from "next/server";

import { safeAuthRedirectPath } from "@/lib/auth/routeAccess";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = safeAuthRedirectPath(next, "/dashboard");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(safeNext, url.origin));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=The confirmation link is invalid or expired.", url.origin),
  );
}

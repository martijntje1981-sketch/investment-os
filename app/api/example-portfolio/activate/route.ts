import { NextResponse } from "next/server";

import { activateExamplePortfolioForUser } from "@/lib/services/examplePortfolio/activate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Idempotent activation for verified sessions (refresh / retry safe). */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { success: false, error: "Example portfolios unavailable." },
      { status: 503 },
    );
  }

  const result = await activateExamplePortfolioForUser({
    admin,
    userClient: supabase,
    user,
  });

  return NextResponse.json({ success: true, result });
}

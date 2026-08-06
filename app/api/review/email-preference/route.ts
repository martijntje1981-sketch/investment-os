import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  fetchMonthlyReviewEmailOptIn,
  isMonthlyReviewEmailConfigured,
  updateMonthlyReviewEmailOptIn,
} from "@/lib/services/portfolio/companion/emailPreference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const optIn = await fetchMonthlyReviewEmailOptIn(supabase, user.id);
    return NextResponse.json({
      success: true,
      optIn,
      emailConfigured: isMonthlyReviewEmailConfigured(),
      defaultOff: true,
      preferenceKey: "monthly_review_email_opt_in",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load preference." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { optIn?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (typeof body.optIn !== "boolean") {
    return NextResponse.json(
      { error: "optIn must be a boolean." },
      { status: 400 },
    );
  }

  // Preference may be saved even when Resend is not configured.
  // Cron / send path still gates delivery on emailConfigured.

  try {
    const optIn = await updateMonthlyReviewEmailOptIn(
      supabase,
      user.id,
      body.optIn,
    );
    const emailConfigured = isMonthlyReviewEmailConfigured();
    return NextResponse.json({
      success: true,
      optIn,
      emailConfigured,
      preferenceKey: "monthly_review_email_opt_in",
      deliveryNote: emailConfigured
        ? null
        : "Preference saved. Delivery starts once email is configured.",
    });
  } catch {
    return NextResponse.json(
      { error: "Could not save preference." },
      { status: 500 },
    );
  }
}

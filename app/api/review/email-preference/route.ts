import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  fetchPeriodReviewEmailPreferences,
  isReviewEmailConfigured,
  updatePeriodReviewEmailPreferences,
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
    const prefs = await fetchPeriodReviewEmailPreferences(supabase, user.id);
    return NextResponse.json({
      success: true,
      weeklyOptIn: prefs.weeklyOptIn,
      monthlyOptIn: prefs.monthlyOptIn,
      optIn: prefs.monthlyOptIn,
      emailConfigured: isReviewEmailConfigured(),
      defaultOff: true,
      preferenceKeys: {
        weekly: "weekly_review_email_opt_in",
        monthly: "monthly_review_email_opt_in",
      },
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

  let body: {
    weeklyOptIn?: unknown;
    monthlyOptIn?: unknown;
    optIn?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const weeklyOptIn =
    typeof body.weeklyOptIn === "boolean" ? body.weeklyOptIn : undefined;
  const monthlyOptIn =
    typeof body.monthlyOptIn === "boolean"
      ? body.monthlyOptIn
      : typeof body.optIn === "boolean"
        ? body.optIn
        : undefined;

  if (weeklyOptIn === undefined && monthlyOptIn === undefined) {
    return NextResponse.json(
      { error: "weeklyOptIn or monthlyOptIn must be a boolean." },
      { status: 400 },
    );
  }

  // Preference may be saved even when Resend is not configured.
  // Cron / send path still gates delivery on emailConfigured.

  try {
    const prefs = await updatePeriodReviewEmailPreferences(supabase, user.id, {
      weeklyOptIn,
      monthlyOptIn,
    });
    const emailConfigured = isReviewEmailConfigured();
    return NextResponse.json({
      success: true,
      weeklyOptIn: prefs.weeklyOptIn,
      monthlyOptIn: prefs.monthlyOptIn,
      optIn: prefs.monthlyOptIn,
      emailConfigured,
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

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
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not load preference.",
      },
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
    return NextResponse.json({ error: "optIn must be a boolean." }, { status: 400 });
  }

  if (body.optIn && !isMonthlyReviewEmailConfigured()) {
    return NextResponse.json(
      {
        error:
          "Monthly review email is not available yet. Your reviews remain available in the app.",
        emailConfigured: false,
      },
      { status: 503 },
    );
  }

  try {
    const optIn = await updateMonthlyReviewEmailOptIn(
      supabase,
      user.id,
      body.optIn,
    );
    return NextResponse.json({
      success: true,
      optIn,
      emailConfigured: isMonthlyReviewEmailConfigured(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Could not save preference.",
      },
      { status: 500 },
    );
  }
}

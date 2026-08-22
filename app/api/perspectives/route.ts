import { NextResponse } from "next/server";

import { fetchPerspectivesPayload } from "@/lib/services/perspectives";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    const payload = await fetchPerspectivesPayload();
    const cacheable = payload.state === "live" && payload.videos.length > 0;
    return NextResponse.json(
      { success: true, ...payload },
      {
        headers: {
          "Cache-Control": cacheable
            ? "public, s-maxage=2700, stale-while-revalidate=3600"
            : "private, no-store",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load perspectives.";
    return NextResponse.json(
      {
        success: false,
        error: message,
        featured: [],
        byCategory: [],
        videos: [],
        state: "provider_unavailable",
        fetchedAt: new Date().toISOString(),
        creatorCount: 0,
        feedErrors: 0,
        unavailableCreatorIds: [],
        schemaVersion: "perspectives-identity-v2",
        servedFromLastSuccess: false,
      },
      { status: 500 },
    );
  }
}

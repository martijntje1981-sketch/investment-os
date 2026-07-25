/**
 * POST /api/analyze-portfolio
 *
 * Screenshot import is disabled in the MVP. This route rejects image uploads
 * so vision/OCR processing cannot be triggered from the client.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const DISABLED_MESSAGE =
  "Portfolio screenshot upload is not available. Add holdings manually or import a CSV or Excel file.";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: DISABLED_MESSAGE,
    },
    { status: 410 },
  );
}

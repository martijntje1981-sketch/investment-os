/**
 * POST /api/analyze-portfolio
 *
 * Screenshot → vision extraction → normalization.
 * Instrument matching runs separately via /api/instruments/match so EODHD
 * quota issues never block extraction from reaching review.
 */

import { NextResponse } from "next/server";
import {
  VisionExtractError,
  extractPortfolioFromScreenshot,
} from "@/lib/services/extraction/visionExtract";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message: "The portfolio analysis service is not configured.",
        },
        { status: 500 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "No screenshot was received." },
        { status: 400 },
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Only JPG, PNG and WEBP images are supported.",
        },
        { status: 400 },
      );
    }
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          message: "The screenshot must be between 1 byte and 10 MB.",
        },
        { status: 400 },
      );
    }

    const extraction = await extractPortfolioFromScreenshot({
      apiKey,
      fileBytes: await file.arrayBuffer(),
      mimeType: file.type,
    });

    if (!extraction.holdings.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "No clear positions were found. Use a sharper screenshot showing the complete portfolio table.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      broker: extraction.broker,
      holdings: extraction.holdings,
    });
  } catch (error) {
    if (error instanceof VisionExtractError) {
      console.error("Portfolio vision extraction failed:", error.message);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status },
      );
    }

    console.error("Portfolio analysis failed:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong while analysing the screenshot.",
      },
      { status: 500 },
    );
  }
}

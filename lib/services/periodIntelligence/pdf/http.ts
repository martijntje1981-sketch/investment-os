import { NextResponse } from "next/server";

export function periodReportPdfHttpResponse(
  bytes: Uint8Array,
  filename: string,
): NextResponse {
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export function periodReportPdfError(
  status: number,
  error: string,
): NextResponse {
  return NextResponse.json(
    { error },
    {
      status,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}

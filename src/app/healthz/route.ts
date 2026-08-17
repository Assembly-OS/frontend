import { NextResponse } from "next/server";
import { assertAuthSecret } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    assertAuthSecret();
    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

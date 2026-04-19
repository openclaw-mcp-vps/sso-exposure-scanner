import { NextRequest, NextResponse } from "next/server";

import { PAYWALL_COOKIE, TEAM_COOKIE } from "@/lib/session";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const teamId = request.cookies.get(TEAM_COOKIE)?.value;

  if (!teamId) {
    return NextResponse.json({ error: "Missing team cookie" }, { status: 400 });
  }

  return NextResponse.json({
    teamId,
    access: request.cookies.get(PAYWALL_COOKIE)?.value === "active"
  });
}

import { NextRequest, NextResponse } from "next/server";
import { PAID_COOKIE_NAME } from "@/lib/constants";
import { getAbsoluteAppUrl, getTeamIdFromCookie } from "@/lib/auth";
import { activatePaidSessionForTeam } from "@/lib/database";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.redirect(
      new URL("/purchase/success?error=missing_session_id", getAbsoluteAppUrl())
    );
  }

  const teamId = await getTeamIdFromCookie();
  const result = await activatePaidSessionForTeam(sessionId, teamId);

  if (!result.success) {
    return NextResponse.redirect(
      new URL(`/purchase/success?session_id=${encodeURIComponent(sessionId)}&error=session_not_found`, getAbsoluteAppUrl())
    );
  }

  const response = NextResponse.redirect(new URL("/dashboard?billing=activated", getAbsoluteAppUrl()));
  response.cookies.set({
    name: PAID_COOKIE_NAME,
    value: "1",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 31
  });

  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { TEAM_COOKIE_NAME } from "@/lib/constants";

export function middleware(request: NextRequest): NextResponse {
  const existingTeamId = request.cookies.get(TEAM_COOKIE_NAME)?.value;
  const response = NextResponse.next();

  if (!existingTeamId) {
    response.cookies.set({
      name: TEAM_COOKIE_NAME,
      value: crypto.randomUUID(),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

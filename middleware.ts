import { NextRequest, NextResponse } from "next/server";

const TEAM_COOKIE = "sso_team_id";
const PAYWALL_COOKIE = "sso_access";

function isProtectedPath(pathname: string): boolean {
  return pathname.startsWith("/dashboard") || pathname.startsWith("/api/scan");
}

function canBypass(pathname: string): boolean {
  return pathname.startsWith("/api/webhooks") || pathname.startsWith("/api/health");
}

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const response = NextResponse.next();

  if (!request.cookies.get(TEAM_COOKIE)?.value) {
    response.cookies.set(TEAM_COOKIE, crypto.randomUUID(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
  }

  if (canBypass(pathname)) {
    return response;
  }

  if (isProtectedPath(pathname) && request.cookies.get(PAYWALL_COOKIE)?.value !== "active") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        {
          error: "Subscription required",
          upgradePath: "/#pricing"
        },
        { status: 402 }
      );
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("paywall", "1");

    const redirectResponse = NextResponse.redirect(redirectUrl);
    const teamId = request.cookies.get(TEAM_COOKIE)?.value;
    if (!teamId) {
      redirectResponse.cookies.set(TEAM_COOKIE, crypto.randomUUID(), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365
      });
    }
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};

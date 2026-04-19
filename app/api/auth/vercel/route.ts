import { randomBytes } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { initDb, query } from "@/lib/database";
import { encryptToken } from "@/lib/security";
import { TEAM_COOKIE } from "@/lib/session";
import { buildVercelOAuthUrl, exchangeVercelCode } from "@/lib/vercel-api";

const OAUTH_STATE_COOKIE = "vercel_oauth_state";

export async function GET(request: NextRequest): Promise<NextResponse> {
  await initDb();

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const teamId = request.cookies.get(TEAM_COOKIE)?.value ?? crypto.randomUUID();
  const redirectUri = `${request.nextUrl.origin}/api/auth/vercel`;

  if (!code) {
    const oauthState = randomBytes(20).toString("hex");
    const authorizeUrl = buildVercelOAuthUrl(oauthState, redirectUri);
    const response = NextResponse.redirect(authorizeUrl);

    response.cookies.set(OAUTH_STATE_COOKIE, oauthState, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10
    });

    response.cookies.set(TEAM_COOKIE, teamId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });

    return response;
  }

  const storedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!state || !storedState || state !== storedState) {
    return NextResponse.json({ error: "Invalid OAuth state." }, { status: 400 });
  }

  const tokenResponse = await exchangeVercelCode(code, redirectUri);

  await query(
    `
      INSERT INTO oauth_connections (
        id,
        team_id,
        provider,
        encrypted_token,
        account_name,
        scope,
        created_at,
        updated_at
      ) VALUES ($1, $2, 'vercel', $3, $4, $5, NOW(), NOW())
      ON CONFLICT (team_id, provider)
      DO UPDATE SET
        encrypted_token = EXCLUDED.encrypted_token,
        account_name = EXCLUDED.account_name,
        scope = EXCLUDED.scope,
        updated_at = NOW()
    `,
    [
      crypto.randomUUID(),
      teamId,
      encryptToken(tokenResponse.accessToken),
      "Connected Vercel account",
      tokenResponse.scope
    ]
  );

  const redirectUrl = new URL("/dashboard", request.nextUrl.origin);
  redirectUrl.searchParams.set("connected", "vercel");
  const response = NextResponse.redirect(redirectUrl);

  response.cookies.delete(OAUTH_STATE_COOKIE);
  response.cookies.set(TEAM_COOKIE, teamId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });

  return response;
}

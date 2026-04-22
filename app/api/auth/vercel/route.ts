import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAbsoluteAppUrl, getTeamIdFromCookie } from "@/lib/auth";
import { cleanupStaleOAuthStates, consumeOAuthState, saveOAuthState, saveProviderToken } from "@/lib/database";
import { exchangeVercelCodeForToken, getVercelAuthUrl } from "@/lib/vercel-client";

function dashboardRedirect(search: string): NextResponse {
  return NextResponse.redirect(new URL(`/dashboard${search}`, getAbsoluteAppUrl()));
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  await cleanupStaleOAuthStates();

  if (error) {
    return dashboardRedirect(`?vercel=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code) {
    const teamId = await getTeamIdFromCookie();
    const generatedState = randomUUID();

    await saveOAuthState(generatedState, teamId, "vercel");

    return NextResponse.redirect(getVercelAuthUrl(generatedState));
  }

  if (!state) {
    return dashboardRedirect("?vercel=error&reason=missing_state");
  }

  const teamId = await consumeOAuthState(state, "vercel");

  if (!teamId) {
    return dashboardRedirect("?vercel=error&reason=invalid_state");
  }

  try {
    const accessToken = await exchangeVercelCodeForToken(code);
    await saveProviderToken(teamId, "vercel", accessToken);
    return dashboardRedirect("?vercel=connected");
  } catch (exchangeError) {
    console.error("Vercel OAuth exchange failed", exchangeError);
    return dashboardRedirect("?vercel=error&reason=oauth_exchange_failed");
  }
}

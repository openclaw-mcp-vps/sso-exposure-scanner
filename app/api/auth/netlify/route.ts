import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAbsoluteAppUrl, getTeamIdFromCookie } from "@/lib/auth";
import { cleanupStaleOAuthStates, consumeOAuthState, saveOAuthState, saveProviderToken } from "@/lib/database";
import { exchangeNetlifyCodeForToken, getNetlifyAuthUrl } from "@/lib/netlify-client";

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
    return dashboardRedirect(`?netlify=error&reason=${encodeURIComponent(error)}`);
  }

  if (!code) {
    const teamId = await getTeamIdFromCookie();
    const generatedState = randomUUID();

    await saveOAuthState(generatedState, teamId, "netlify");

    return NextResponse.redirect(getNetlifyAuthUrl(generatedState));
  }

  if (!state) {
    return dashboardRedirect("?netlify=error&reason=missing_state");
  }

  const teamId = await consumeOAuthState(state, "netlify");

  if (!teamId) {
    return dashboardRedirect("?netlify=error&reason=invalid_state");
  }

  try {
    const accessToken = await exchangeNetlifyCodeForToken(code);
    await saveProviderToken(teamId, "netlify", accessToken);
    return dashboardRedirect("?netlify=connected");
  } catch (exchangeError) {
    console.error("Netlify OAuth exchange failed", exchangeError);
    return dashboardRedirect("?netlify=error&reason=oauth_exchange_failed");
  }
}

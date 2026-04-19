import { cookies } from "next/headers";

export const TEAM_COOKIE = "sso_team_id";
export const PAYWALL_COOKIE = "sso_access";

export async function getTeamId(): Promise<string> {
  const cookieStore = await cookies();
  const teamId = cookieStore.get(TEAM_COOKIE)?.value;

  if (!teamId) {
    throw new Error("Missing team identifier. Reload the page to initialize your workspace.");
  }

  return teamId;
}

export function isTeamAccessCookie(value: string | undefined): boolean {
  return value === "active";
}

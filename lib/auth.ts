import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { PAID_COOKIE_NAME, TEAM_COOKIE_NAME } from "@/lib/constants";

export async function getTeamIdFromCookie(): Promise<string> {
  const cookieStore = await cookies();
  const teamId = cookieStore.get(TEAM_COOKIE_NAME)?.value;
  return teamId && teamId.length > 10 ? teamId : randomUUID();
}

export async function hasPaidAccessCookie(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get(PAID_COOKIE_NAME)?.value === "1";
}

export function getAbsoluteAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

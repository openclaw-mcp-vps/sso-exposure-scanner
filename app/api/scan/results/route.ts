import { NextResponse } from "next/server";
import { getTeamIdFromCookie, hasPaidAccessCookie } from "@/lib/auth";
import { getLatestScan, isTeamSubscribed } from "@/lib/database";

export async function GET(): Promise<NextResponse> {
  const teamId = await getTeamIdFromCookie();
  const [hasAccessCookie, subscribed] = await Promise.all([
    hasPaidAccessCookie(),
    isTeamSubscribed(teamId)
  ]);

  if (!hasAccessCookie || !subscribed) {
    return NextResponse.json(
      {
        error: "Paid access is required to view scan results."
      },
      { status: 402 }
    );
  }

  const latestScan = await getLatestScan(teamId);
  return NextResponse.json(latestScan);
}

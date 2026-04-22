import { NextResponse } from "next/server";
import { getTeamIdFromCookie, hasPaidAccessCookie } from "@/lib/auth";
import { createScanRun, getTeamConnections, isTeamSubscribed } from "@/lib/database";
import { enqueueScanJob } from "@/lib/queue";
import { runDeploymentScan } from "@/lib/scanner";

export async function POST(): Promise<NextResponse> {
  const teamId = await getTeamIdFromCookie();
  const [hasAccessCookie, subscribed, connections] = await Promise.all([
    hasPaidAccessCookie(),
    isTeamSubscribed(teamId),
    getTeamConnections(teamId)
  ]);

  if (!hasAccessCookie || !subscribed) {
    return NextResponse.json(
      {
        error: "A paid subscription and access cookie are required before running scans."
      },
      { status: 402 }
    );
  }

  if (!connections.vercelAccessToken && !connections.netlifyAccessToken) {
    return NextResponse.json(
      {
        error: "Connect Vercel or Netlify before triggering a scan."
      },
      { status: 400 }
    );
  }

  const runId = await createScanRun(teamId);
  const queued = await enqueueScanJob({ teamId, runId });

  if (!queued) {
    void runDeploymentScan(teamId, runId).catch((error) => {
      console.error(`Fallback inline scan failed for run ${runId}`, error);
    });
  }

  return NextResponse.json({
    status: queued ? "queued" : "started",
    runId
  });
}

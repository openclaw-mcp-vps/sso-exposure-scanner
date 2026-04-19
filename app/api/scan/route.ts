import { NextRequest, NextResponse } from "next/server";

import { initDb, query } from "@/lib/database";
import { PAYWALL_COOKIE, TEAM_COOKIE } from "@/lib/session";
import { scanTeam } from "@/lib/scanner";

type ProjectRow = {
  id: string;
  provider: "vercel" | "netlify";
  name: string;
  framework: string | null;
  url: string | null;
  updated_at: string;
};

type ScanRow = {
  id: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  summary: {
    projectsScanned?: number;
    blockedCount?: number;
    estimatedLostCustomers?: number;
    estimatedMrrLossCents?: number;
    error?: string;
  } | null;
};

type ResultRow = {
  id: string;
  project_id: string;
  deployment_url: string;
  status_code: number | null;
  gated: boolean;
  gate_reason: string;
  page_title: string | null;
  response_ms: number;
  estimated_monthly_visitors: number;
  estimated_lost_customers: number;
  estimated_mrr_loss_cents: number;
  project_name: string;
  provider: string;
};

function missingAccessResponse(): NextResponse {
  return NextResponse.json(
    {
      error: "Subscription required"
    },
    { status: 402 }
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (request.cookies.get(PAYWALL_COOKIE)?.value !== "active") {
    return missingAccessResponse();
  }

  const teamId = request.cookies.get(TEAM_COOKIE)?.value;
  if (!teamId) {
    return NextResponse.json({ error: "Missing team cookie" }, { status: 400 });
  }

  await initDb();

  const connected = await query<{ provider: string }>(
    `
      SELECT provider
      FROM oauth_connections
      WHERE team_id = $1
      ORDER BY provider ASC
    `,
    [teamId]
  );

  const projects = await query<ProjectRow>(
    `
      SELECT id, provider, name, framework, url, updated_at
      FROM projects
      WHERE team_id = $1
      ORDER BY updated_at DESC, name ASC
    `,
    [teamId]
  );

  const latestScan = await query<ScanRow>(
    `
      SELECT id, status, started_at, finished_at, summary
      FROM scans
      WHERE team_id = $1
      ORDER BY started_at DESC
      LIMIT 1
    `,
    [teamId]
  );

  const scan = latestScan.rows[0] ?? null;
  let results: ResultRow[] = [];

  if (scan) {
    const scanResults = await query<ResultRow>(
      `
        SELECT
          sr.id,
          sr.project_id,
          sr.deployment_url,
          sr.status_code,
          sr.gated,
          sr.gate_reason,
          sr.page_title,
          sr.response_ms,
          sr.estimated_monthly_visitors,
          sr.estimated_lost_customers,
          sr.estimated_mrr_loss_cents,
          p.name AS project_name,
          p.provider AS provider
        FROM scan_results sr
        LEFT JOIN projects p ON p.id = sr.project_id
        WHERE sr.scan_id = $1
        ORDER BY sr.estimated_mrr_loss_cents DESC, sr.created_at DESC
      `,
      [scan.id]
    );

    results = scanResults.rows;
  }

  return NextResponse.json({
    teamId,
    connectedProviders: connected.rows.map((row: { provider: string }) => row.provider),
    projects: projects.rows,
    latestScan: scan,
    results
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (request.cookies.get(PAYWALL_COOKIE)?.value !== "active") {
    return missingAccessResponse();
  }

  const teamId = request.cookies.get(TEAM_COOKIE)?.value;
  if (!teamId) {
    return NextResponse.json({ error: "Missing team cookie" }, { status: 400 });
  }

  try {
    const result = await scanTeam(teamId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to run scan"
      },
      { status: 500 }
    );
  }
}

import axios from "axios";
import { load } from "cheerio";

import { initDb, query } from "@/lib/database";
import { fetchNetlifyProjects } from "@/lib/netlify-api";
import { decryptToken } from "@/lib/security";
import { fetchVercelProjects } from "@/lib/vercel-api";

type DbConnection = {
  provider: "vercel" | "netlify";
  encrypted_token: string;
};

type DbProject = {
  id: string;
  team_id: string;
  provider: "vercel" | "netlify";
  provider_project_id: string;
  name: string;
  framework: string | null;
  url: string | null;
};

type ScanCheck = {
  deploymentUrl: string;
  statusCode: number | null;
  gated: boolean;
  gateReason: string;
  pageTitle: string | null;
  responseMs: number;
  estimatedMonthlyVisitors: number;
  estimatedLostCustomers: number;
  estimatedMrrLossCents: number;
};

type ExternalProject = {
  provider: "vercel" | "netlify";
  providerProjectId: string;
  name: string;
  framework: string | null;
  primaryUrl: string;
  deploymentUrl: string;
};

type ScanSummary = {
  projectsScanned: number;
  blockedCount: number;
  estimatedLostCustomers: number;
  estimatedMrrLossCents: number;
};

function normalizeUrl(input: string): string {
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }

  return `https://${input}`;
}

function estimateImpact(project: DbProject, gated: boolean): {
  estimatedMonthlyVisitors: number;
  estimatedLostCustomers: number;
  estimatedMrrLossCents: number;
} {
  const entropy = `${project.name}:${project.provider_project_id}:${project.provider}`;
  const score = entropy.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);

  const estimatedMonthlyVisitors = 120 + (score % 1400);
  if (!gated) {
    return {
      estimatedMonthlyVisitors,
      estimatedLostCustomers: 0,
      estimatedMrrLossCents: 0
    };
  }

  const estimatedLostCustomers = Math.max(1, Math.ceil(estimatedMonthlyVisitors * 0.032));
  const estimatedMrrLossCents = estimatedLostCustomers * 4900;

  return {
    estimatedMonthlyVisitors,
    estimatedLostCustomers,
    estimatedMrrLossCents
  };
}

function detectGate(statusCode: number | null, bodyText: string, headers: Record<string, string>): {
  gated: boolean;
  reason: string;
} {
  if (statusCode === 401 || statusCode === 403) {
    return {
      gated: true,
      reason: `HTTP ${statusCode} returned`
    };
  }

  const hintPatterns = [
    "password protected",
    "authentication required",
    "access denied",
    "not authorized",
    "restricted access",
    "enter password",
    "sso",
    "login required"
  ];

  const hasKeyword = hintPatterns.some((pattern) => bodyText.includes(pattern));
  const authHeader = headers["www-authenticate"];

  if (authHeader) {
    return {
      gated: true,
      reason: `Auth challenge header present (${authHeader})`
    };
  }

  if (hasKeyword && (statusCode === 200 || statusCode === 302)) {
    return {
      gated: true,
      reason: "Auth wall content detected in response body"
    };
  }

  return {
    gated: false,
    reason: "No auth gate detected"
  };
}

async function checkDeployment(url: string, project: DbProject): Promise<ScanCheck> {
  const startedAt = Date.now();

  try {
    const response = await axios.get<string>(normalizeUrl(url), {
      timeout: 15_000,
      maxRedirects: 5,
      validateStatus: () => true,
      responseType: "text"
    });

    const statusCode = response.status;
    const responseMs = Date.now() - startedAt;
    const body = typeof response.data === "string" ? response.data.toLowerCase() : "";
    const headers: Record<string, string> = {};

    Object.entries(response.headers).forEach(([key, value]) => {
      headers[key.toLowerCase()] = Array.isArray(value) ? value.join(",") : String(value ?? "");
    });

    const { gated, reason } = detectGate(statusCode, body, headers);
    const $ = typeof response.data === "string" ? load(response.data) : null;
    const title = $ ? $("title").first().text().trim() : "";
    const impact = estimateImpact(project, gated);

    return {
      deploymentUrl: normalizeUrl(url),
      statusCode,
      gated,
      gateReason: reason,
      pageTitle: title || null,
      responseMs,
      ...impact
    };
  } catch (error) {
    const responseMs = Date.now() - startedAt;
    const impact = estimateImpact(project, true);

    return {
      deploymentUrl: normalizeUrl(url),
      statusCode: null,
      gated: true,
      gateReason: error instanceof Error ? `Request failed: ${error.message}` : "Request failed",
      pageTitle: null,
      responseMs,
      ...impact
    };
  }
}

async function getTeamConnections(teamId: string): Promise<DbConnection[]> {
  const result = await query<DbConnection>(
    `
      SELECT provider, encrypted_token
      FROM oauth_connections
      WHERE team_id = $1
    `,
    [teamId]
  );

  return result.rows;
}

async function upsertProject(teamId: string, external: ExternalProject): Promise<DbProject> {
  const id = crypto.randomUUID();

  const result = await query<DbProject>(
    `
      INSERT INTO projects (
        id,
        team_id,
        provider,
        provider_project_id,
        name,
        framework,
        url,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (team_id, provider, provider_project_id)
      DO UPDATE SET
        name = EXCLUDED.name,
        framework = EXCLUDED.framework,
        url = EXCLUDED.url,
        updated_at = NOW()
      RETURNING id, team_id, provider, provider_project_id, name, framework, url
    `,
    [
      id,
      teamId,
      external.provider,
      external.providerProjectId,
      external.name,
      external.framework,
      external.primaryUrl
    ]
  );

  return result.rows[0];
}

async function fetchConnectedProjects(connections: DbConnection[]): Promise<ExternalProject[]> {
  const projects: ExternalProject[] = [];

  for (const connection of connections) {
    const token = decryptToken(connection.encrypted_token);

    if (connection.provider === "vercel") {
      const vercelProjects = await fetchVercelProjects(token);
      projects.push(...vercelProjects);
      continue;
    }

    const netlifyProjects = await fetchNetlifyProjects(token);
    projects.push(...netlifyProjects);
  }

  return projects;
}

function summarize(results: ScanCheck[]): ScanSummary {
  return results.reduce<ScanSummary>(
    (acc, row) => {
      acc.projectsScanned += 1;
      if (row.gated) {
        acc.blockedCount += 1;
        acc.estimatedLostCustomers += row.estimatedLostCustomers;
        acc.estimatedMrrLossCents += row.estimatedMrrLossCents;
      }
      return acc;
    },
    {
      projectsScanned: 0,
      blockedCount: 0,
      estimatedLostCustomers: 0,
      estimatedMrrLossCents: 0
    }
  );
}

export type TeamScanResult = {
  scanId: string;
  summary: ScanSummary;
  results: Array<ScanCheck & { projectId: string }>;
};

export async function scanTeam(teamId: string): Promise<TeamScanResult> {
  await initDb();

  const connections = await getTeamConnections(teamId);
  if (connections.length === 0) {
    throw new Error("No Vercel or Netlify accounts are connected.");
  }

  const scanId = crypto.randomUUID();
  await query(
    `
      INSERT INTO scans (id, team_id, status, started_at)
      VALUES ($1, $2, 'running', NOW())
    `,
    [scanId, teamId]
  );

  try {
    const externalProjects = await fetchConnectedProjects(connections);

    const scanRows: Array<ScanCheck & { projectId: string }> = [];

    for (const externalProject of externalProjects) {
      const project = await upsertProject(teamId, externalProject);
      const check = await checkDeployment(externalProject.deploymentUrl, project);

      scanRows.push({
        ...check,
        projectId: project.id
      });

      await query(
        `
          INSERT INTO scan_results (
            id,
            scan_id,
            project_id,
            deployment_url,
            status_code,
            gated,
            gate_reason,
            page_title,
            response_ms,
            estimated_monthly_visitors,
            estimated_lost_customers,
            estimated_mrr_loss_cents,
            created_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()
          )
        `,
        [
          crypto.randomUUID(),
          scanId,
          project.id,
          check.deploymentUrl,
          check.statusCode,
          check.gated,
          check.gateReason,
          check.pageTitle,
          check.responseMs,
          check.estimatedMonthlyVisitors,
          check.estimatedLostCustomers,
          check.estimatedMrrLossCents
        ]
      );
    }

    const summary = summarize(scanRows);

    await query(
      `
        UPDATE scans
        SET
          status = 'completed',
          finished_at = NOW(),
          summary = $2::jsonb
        WHERE id = $1
      `,
      [scanId, JSON.stringify(summary)]
    );

    return {
      scanId,
      summary,
      results: scanRows
    };
  } catch (error) {
    await query(
      `
        UPDATE scans
        SET
          status = 'failed',
          finished_at = NOW(),
          summary = jsonb_build_object('error', $2)
        WHERE id = $1
      `,
      [scanId, error instanceof Error ? error.message : "Unknown scan error"]
    );

    throw error;
  }
}

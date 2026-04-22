import axios from "axios";
import * as cheerio from "cheerio";
import { DEFAULT_PLAN_MRR, DEFAULT_SCAN_TIMEOUT_MS } from "@/lib/constants";
import {
  completeScanRun,
  getTeamConnections,
  insertScanResults,
  markScanRunFailed,
  type Provider,
  type ScanResultInput
} from "@/lib/database";
import { fetchNetlifyDeployments } from "@/lib/netlify-client";
import { fetchVercelDeployments } from "@/lib/vercel-client";

type DeploymentTarget = {
  provider: Provider;
  projectName: string;
  deploymentUrl: string;
};

type ProbedResult = ScanResultInput;

const BLOCK_MARKERS = [
  "401 unauthorized",
  "authentication required",
  "protected by password",
  "vercel authentication",
  "access denied",
  "site password",
  "password protected",
  "please log in",
  "sign in to continue"
];

const REDIRECT_AUTH_MARKERS = [
  "login",
  "signin",
  "auth",
  "password",
  "protected",
  "saml",
  "sso"
];

function calculateImpact(deploymentUrl: string, isBlocked: boolean): {
  visitors: number;
  lostCustomers: number;
  mrrLoss: number;
} {
  const seed = Array.from(deploymentUrl).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const visitors = 120 + (seed % 2400);

  if (!isBlocked) {
    return {
      visitors,
      lostCustomers: 0,
      mrrLoss: 0
    };
  }

  const lostCustomers = Math.max(1, Math.round(visitors * 0.014));
  const mrrLoss = Number((lostCustomers * DEFAULT_PLAN_MRR).toFixed(2));

  return {
    visitors,
    lostCustomers,
    mrrLoss
  };
}

function detectGuardFromBody(html: string): string {
  const lower = html.toLowerCase();

  if (lower.includes("vercel authentication") || lower.includes("vercel sso")) {
    return "vercel-protection";
  }

  if (lower.includes("netlify") && lower.includes("password")) {
    return "netlify-password-protection";
  }

  if (lower.includes("basic realm") || lower.includes("www-authenticate")) {
    return "basic-auth";
  }

  if (lower.includes("cloudflare") && lower.includes("access")) {
    return "cloudflare-access";
  }

  return "unknown";
}

async function runOptionalBrowserProbe(url: string): Promise<{ detectedGuard: string } | null> {
  if (process.env.ENABLE_BROWSER_SCAN !== "1") {
    return null;
  }

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
    const content = await page.content();
    return {
      detectedGuard: detectGuardFromBody(content)
    };
  } finally {
    await browser.close();
  }
}

async function probeDeployment(target: DeploymentTarget): Promise<ProbedResult> {
  const started = Date.now();
  const timeout = Number(process.env.SCAN_REQUEST_TIMEOUT_MS ?? DEFAULT_SCAN_TIMEOUT_MS);

  try {
    const response = await axios.get<string>(target.deploymentUrl, {
      timeout,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        "User-Agent": "SSO-Exposure-Scanner/1.0"
      },
      responseType: "text"
    });

    const statusCode = response.status;
    const htmlBody = typeof response.data === "string" ? response.data : "";
    const location = String(response.headers.location ?? "").toLowerCase();

    const $ = cheerio.load(htmlBody || "");
    const title = $("title").text().trim().toLowerCase();
    const mergedText = `${title} ${$.root().text().toLowerCase()}`;

    const markerMatch = BLOCK_MARKERS.find((marker) => mergedText.includes(marker));
    const redirectSignalsAuth =
      (statusCode >= 300 && statusCode < 400) &&
      REDIRECT_AUTH_MARKERS.some((marker) => location.includes(marker));

    const blockedByStatus = statusCode === 401 || statusCode === 403;
    const blockedByMarker = Boolean(markerMatch);
    const isBlocked = blockedByStatus || blockedByMarker || redirectSignalsAuth;

    let detectedGuard = detectGuardFromBody(htmlBody);

    if (!isBlocked && detectedGuard === "unknown") {
      const browserProbe = await runOptionalBrowserProbe(target.deploymentUrl);
      if (browserProbe?.detectedGuard && browserProbe.detectedGuard !== "unknown") {
        detectedGuard = browserProbe.detectedGuard;
      }
    }

    const impact = calculateImpact(target.deploymentUrl, isBlocked);

    return {
      provider: target.provider,
      projectName: target.projectName,
      deploymentUrl: target.deploymentUrl,
      statusCode,
      isBlocked,
      blockReason: blockedByStatus
        ? `HTTP ${statusCode} returned`
        : blockedByMarker
          ? `Auth marker detected: ${markerMatch}`
          : redirectSignalsAuth
            ? "Redirects to authentication flow"
            : "URL appears public",
      detectedGuard,
      estimatedMonthlyVisitors: impact.visitors,
      estimatedLostCustomers: impact.lostCustomers,
      estimatedMrrLoss: impact.mrrLoss,
      responseTimeMs: Date.now() - started
    };
  } catch (error) {
    const impact = calculateImpact(target.deploymentUrl, true);

    return {
      provider: target.provider,
      projectName: target.projectName,
      deploymentUrl: target.deploymentUrl,
      statusCode: 0,
      isBlocked: true,
      blockReason:
        error instanceof Error
          ? `Request failed: ${error.message}`
          : "Request failed due to unknown network error",
      detectedGuard: "unknown",
      estimatedMonthlyVisitors: impact.visitors,
      estimatedLostCustomers: impact.lostCustomers,
      estimatedMrrLoss: impact.mrrLoss,
      responseTimeMs: Date.now() - started
    };
  }
}

function uniqueTargets(targets: DeploymentTarget[]): DeploymentTarget[] {
  const seen = new Set<string>();
  const deduped: DeploymentTarget[] = [];

  for (const target of targets) {
    const normalizedUrl = target.deploymentUrl.replace(/\/$/, "");
    const key = `${target.provider}:${normalizedUrl}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push({ ...target, deploymentUrl: normalizedUrl });
  }

  return deduped;
}

async function mapWithConcurrency<TInput, TOutput>(
  inputs: TInput[],
  concurrency: number,
  mapper: (input: TInput) => Promise<TOutput>
): Promise<TOutput[]> {
  const output: TOutput[] = new Array(inputs.length);
  let cursor = 0;

  async function worker(): Promise<void> {
    while (true) {
      const current = cursor;
      cursor += 1;

      if (current >= inputs.length) {
        return;
      }

      output[current] = await mapper(inputs[current]);
    }
  }

  const workers = Array.from({ length: Math.max(1, concurrency) }, () => worker());
  await Promise.all(workers);
  return output;
}

export async function runDeploymentScan(teamId: string, runId: string): Promise<void> {
  try {
    const connections = await getTeamConnections(teamId);

    const targets: DeploymentTarget[] = [];

    if (connections.vercelAccessToken) {
      const vercelTargets = await fetchVercelDeployments(connections.vercelAccessToken);
      targets.push(...vercelTargets);
    }

    if (connections.netlifyAccessToken) {
      const netlifyTargets = await fetchNetlifyDeployments(connections.netlifyAccessToken);
      targets.push(...netlifyTargets);
    }

    const dedupedTargets = uniqueTargets(targets);

    const results = await mapWithConcurrency(
      dedupedTargets,
      4,
      async (target) => probeDeployment(target)
    );

    await insertScanResults(runId, teamId, results);

    const blockedUrls = results.filter((result) => result.isBlocked).length;
    const estimatedMonthlyMrrLoss = results.reduce(
      (sum, result) => sum + result.estimatedMrrLoss,
      0
    );

    await completeScanRun(
      runId,
      results.length,
      blockedUrls,
      Number(estimatedMonthlyMrrLoss.toFixed(2))
    );
  } catch (error) {
    await markScanRunFailed(runId);
    throw error;
  }
}

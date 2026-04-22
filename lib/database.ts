import { randomUUID } from "node:crypto";
import { Pool } from "pg";

export type Provider = "vercel" | "netlify";

export type ScanResultInput = {
  provider: Provider;
  projectName: string;
  deploymentUrl: string;
  statusCode: number;
  isBlocked: boolean;
  blockReason: string;
  detectedGuard: string;
  estimatedMonthlyVisitors: number;
  estimatedLostCustomers: number;
  estimatedMrrLoss: number;
  responseTimeMs: number;
};

type TeamConnections = {
  vercelConnected: boolean;
  netlifyConnected: boolean;
  vercelConnectedAt: string | null;
  netlifyConnectedAt: string | null;
  vercelAccessToken: string | null;
  netlifyAccessToken: string | null;
  activeSubscription: boolean;
};

declare global {
  var __ssoExposurePool: Pool | undefined;
  var __ssoExposureDbReady: boolean | undefined;
}

const pool =
  global.__ssoExposurePool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.DATABASE_URL?.includes("localhost") ||
      process.env.DATABASE_URL?.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false }
  });

global.__ssoExposurePool = pool;

async function ensureDatabase(): Promise<void> {
  if (global.__ssoExposureDbReady) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      vercel_access_token TEXT,
      netlify_access_token TEXT,
      vercel_connected_at TIMESTAMPTZ,
      netlify_connected_at TIMESTAMPTZ,
      stripe_customer_email TEXT,
      active_subscription BOOLEAN NOT NULL DEFAULT FALSE,
      subscription_activated_at TIMESTAMPTZ
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS oauth_states (
      state TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      team_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scan_runs (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      total_urls INTEGER NOT NULL DEFAULT 0,
      blocked_urls INTEGER NOT NULL DEFAULT 0,
      estimated_monthly_mrr_loss NUMERIC(12, 2) NOT NULL DEFAULT 0
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS scan_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL REFERENCES scan_runs(id) ON DELETE CASCADE,
      team_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      project_name TEXT NOT NULL,
      deployment_url TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      is_blocked BOOLEAN NOT NULL,
      block_reason TEXT NOT NULL,
      detected_guard TEXT NOT NULL,
      estimated_monthly_visitors INTEGER NOT NULL,
      estimated_lost_customers INTEGER NOT NULL,
      estimated_mrr_loss NUMERIC(12, 2) NOT NULL,
      response_time_ms INTEGER NOT NULL,
      checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS paid_sessions (
      session_id TEXT PRIMARY KEY,
      customer_email TEXT,
      amount_total_cents INTEGER,
      currency TEXT,
      paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      raw_event JSONB NOT NULL,
      activated_team_id TEXT,
      activated_at TIMESTAMPTZ
    );
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_scan_runs_team_started
    ON scan_runs (team_id, started_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_scan_results_team_checked
    ON scan_results (team_id, checked_at DESC);
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_oauth_states_created
    ON oauth_states (created_at);
  `);

  global.__ssoExposureDbReady = true;
}

export async function pingDatabase(): Promise<void> {
  await ensureDatabase();
  await pool.query("SELECT 1");
}

export async function ensureTeam(teamId: string): Promise<void> {
  await ensureDatabase();
  await pool.query(
    `
      INSERT INTO teams (id)
      VALUES ($1)
      ON CONFLICT (id) DO NOTHING;
    `,
    [teamId]
  );
}

export async function saveOAuthState(
  state: string,
  teamId: string,
  provider: Provider
): Promise<void> {
  await ensureDatabase();
  await pool.query(
    `
      INSERT INTO oauth_states (state, provider, team_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (state)
      DO UPDATE SET provider = EXCLUDED.provider, team_id = EXCLUDED.team_id, created_at = NOW();
    `,
    [state, provider, teamId]
  );
}

export async function consumeOAuthState(
  state: string,
  provider: Provider
): Promise<string | null> {
  await ensureDatabase();

  const result = await pool.query<{
    team_id: string;
    provider: string;
  }>(
    `
      DELETE FROM oauth_states
      WHERE state = $1
      RETURNING team_id, provider;
    `,
    [state]
  );

  const row = result.rows[0];
  if (!row || row.provider !== provider) {
    return null;
  }

  return row.team_id;
}

export async function cleanupStaleOAuthStates(): Promise<void> {
  await ensureDatabase();
  await pool.query(
    `
      DELETE FROM oauth_states
      WHERE created_at < NOW() - INTERVAL '30 minutes';
    `
  );
}

export async function saveProviderToken(
  teamId: string,
  provider: Provider,
  accessToken: string
): Promise<void> {
  await ensureTeam(teamId);

  if (provider === "vercel") {
    await pool.query(
      `
        UPDATE teams
        SET vercel_access_token = $2,
            vercel_connected_at = NOW()
        WHERE id = $1;
      `,
      [teamId, accessToken]
    );
    return;
  }

  await pool.query(
    `
      UPDATE teams
      SET netlify_access_token = $2,
          netlify_connected_at = NOW()
      WHERE id = $1;
    `,
    [teamId, accessToken]
  );
}

export async function getTeamConnections(teamId: string): Promise<TeamConnections> {
  await ensureTeam(teamId);
  const result = await pool.query<{
    vercel_access_token: string | null;
    netlify_access_token: string | null;
    vercel_connected_at: string | null;
    netlify_connected_at: string | null;
    active_subscription: boolean;
  }>(
    `
      SELECT vercel_access_token,
             netlify_access_token,
             vercel_connected_at,
             netlify_connected_at,
             active_subscription
      FROM teams
      WHERE id = $1
      LIMIT 1;
    `,
    [teamId]
  );

  const row = result.rows[0];

  return {
    vercelConnected: Boolean(row?.vercel_access_token),
    netlifyConnected: Boolean(row?.netlify_access_token),
    vercelConnectedAt: row?.vercel_connected_at ?? null,
    netlifyConnectedAt: row?.netlify_connected_at ?? null,
    vercelAccessToken: row?.vercel_access_token ?? null,
    netlifyAccessToken: row?.netlify_access_token ?? null,
    activeSubscription: row?.active_subscription ?? false
  };
}

export async function createScanRun(teamId: string): Promise<string> {
  await ensureTeam(teamId);
  const runId = randomUUID();
  await pool.query(
    `
      INSERT INTO scan_runs (id, team_id, status)
      VALUES ($1, $2, 'running');
    `,
    [runId, teamId]
  );

  return runId;
}

export async function markScanRunFailed(runId: string): Promise<void> {
  await ensureDatabase();
  await pool.query(
    `
      UPDATE scan_runs
      SET status = 'failed', completed_at = NOW()
      WHERE id = $1;
    `,
    [runId]
  );
}

export async function completeScanRun(
  runId: string,
  totalUrls: number,
  blockedUrls: number,
  estimatedMonthlyMrrLoss: number
): Promise<void> {
  await ensureDatabase();
  await pool.query(
    `
      UPDATE scan_runs
      SET status = 'completed',
          completed_at = NOW(),
          total_urls = $2,
          blocked_urls = $3,
          estimated_monthly_mrr_loss = $4
      WHERE id = $1;
    `,
    [runId, totalUrls, blockedUrls, estimatedMonthlyMrrLoss]
  );
}

export async function insertScanResults(
  runId: string,
  teamId: string,
  rows: ScanResultInput[]
): Promise<void> {
  await ensureDatabase();

  if (rows.length === 0) {
    return;
  }

  const values: string[] = [];
  const params: unknown[] = [];

  rows.forEach((row, index) => {
    const baseIndex = index * 14;
    values.push(
      `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9}, $${baseIndex + 10}, $${baseIndex + 11}, $${baseIndex + 12}, $${baseIndex + 13}, $${baseIndex + 14})`
    );

    params.push(
      randomUUID(),
      runId,
      teamId,
      row.provider,
      row.projectName,
      row.deploymentUrl,
      row.statusCode,
      row.isBlocked,
      row.blockReason,
      row.detectedGuard,
      row.estimatedMonthlyVisitors,
      row.estimatedLostCustomers,
      row.estimatedMrrLoss,
      row.responseTimeMs
    );
  });

  await pool.query(
    `
      INSERT INTO scan_results (
        id,
        run_id,
        team_id,
        provider,
        project_name,
        deployment_url,
        status_code,
        is_blocked,
        block_reason,
        detected_guard,
        estimated_monthly_visitors,
        estimated_lost_customers,
        estimated_mrr_loss,
        response_time_ms
      )
      VALUES ${values.join(",")};
    `,
    params
  );
}

export type LatestScanResponse = {
  run: {
    id: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    totalUrls: number;
    blockedUrls: number;
    estimatedMonthlyMrrLoss: number;
  } | null;
  results: Array<{
    id: string;
    provider: Provider;
    projectName: string;
    deploymentUrl: string;
    statusCode: number;
    isBlocked: boolean;
    blockReason: string;
    detectedGuard: string;
    estimatedMonthlyVisitors: number;
    estimatedLostCustomers: number;
    estimatedMrrLoss: number;
    checkedAt: string;
  }>;
};

export async function getLatestScan(teamId: string): Promise<LatestScanResponse> {
  await ensureTeam(teamId);

  const runResult = await pool.query<{
    id: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    total_urls: number;
    blocked_urls: number;
    estimated_monthly_mrr_loss: string;
  }>(
    `
      SELECT id,
             status,
             started_at,
             completed_at,
             total_urls,
             blocked_urls,
             estimated_monthly_mrr_loss
      FROM scan_runs
      WHERE team_id = $1
      ORDER BY started_at DESC
      LIMIT 1;
    `,
    [teamId]
  );

  const run = runResult.rows[0];

  if (!run) {
    return { run: null, results: [] };
  }

  const resultsResult = await pool.query<{
    id: string;
    provider: Provider;
    project_name: string;
    deployment_url: string;
    status_code: number;
    is_blocked: boolean;
    block_reason: string;
    detected_guard: string;
    estimated_monthly_visitors: number;
    estimated_lost_customers: number;
    estimated_mrr_loss: string;
    checked_at: string;
  }>(
    `
      SELECT id,
             provider,
             project_name,
             deployment_url,
             status_code,
             is_blocked,
             block_reason,
             detected_guard,
             estimated_monthly_visitors,
             estimated_lost_customers,
             estimated_mrr_loss,
             checked_at
      FROM scan_results
      WHERE run_id = $1
      ORDER BY is_blocked DESC, estimated_mrr_loss DESC, project_name ASC;
    `,
    [run.id]
  );

  return {
    run: {
      id: run.id,
      status: run.status,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      totalUrls: run.total_urls,
      blockedUrls: run.blocked_urls,
      estimatedMonthlyMrrLoss: Number(run.estimated_monthly_mrr_loss)
    },
    results: resultsResult.rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      projectName: row.project_name,
      deploymentUrl: row.deployment_url,
      statusCode: row.status_code,
      isBlocked: row.is_blocked,
      blockReason: row.block_reason,
      detectedGuard: row.detected_guard,
      estimatedMonthlyVisitors: row.estimated_monthly_visitors,
      estimatedLostCustomers: row.estimated_lost_customers,
      estimatedMrrLoss: Number(row.estimated_mrr_loss),
      checkedAt: row.checked_at
    }))
  };
}

export async function recordPaidSession(input: {
  sessionId: string;
  customerEmail: string | null;
  amountTotalCents: number | null;
  currency: string | null;
  rawEvent: unknown;
}): Promise<void> {
  await ensureDatabase();

  await pool.query(
    `
      INSERT INTO paid_sessions (
        session_id,
        customer_email,
        amount_total_cents,
        currency,
        raw_event
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (session_id)
      DO UPDATE SET
        customer_email = EXCLUDED.customer_email,
        amount_total_cents = EXCLUDED.amount_total_cents,
        currency = EXCLUDED.currency,
        raw_event = EXCLUDED.raw_event;
    `,
    [
      input.sessionId,
      input.customerEmail,
      input.amountTotalCents,
      input.currency,
      JSON.stringify(input.rawEvent)
    ]
  );
}

export async function activatePaidSessionForTeam(
  sessionId: string,
  teamId: string
): Promise<{ success: boolean; customerEmail: string | null }> {
  await ensureTeam(teamId);

  const paidSessionResult = await pool.query<{
    customer_email: string | null;
  }>(
    `
      SELECT customer_email
      FROM paid_sessions
      WHERE session_id = $1
      LIMIT 1;
    `,
    [sessionId]
  );

  const session = paidSessionResult.rows[0];

  if (!session) {
    return { success: false, customerEmail: null };
  }

  await pool.query(
    `
      UPDATE paid_sessions
      SET activated_team_id = $2,
          activated_at = NOW()
      WHERE session_id = $1;
    `,
    [sessionId, teamId]
  );

  await pool.query(
    `
      UPDATE teams
      SET active_subscription = TRUE,
          subscription_activated_at = NOW(),
          stripe_customer_email = COALESCE($2, stripe_customer_email)
      WHERE id = $1;
    `,
    [teamId, session.customer_email]
  );

  return { success: true, customerEmail: session.customer_email };
}

export async function isTeamSubscribed(teamId: string): Promise<boolean> {
  await ensureTeam(teamId);

  const result = await pool.query<{
    active_subscription: boolean;
  }>(
    `
      SELECT active_subscription
      FROM teams
      WHERE id = $1
      LIMIT 1;
    `,
    [teamId]
  );

  return result.rows[0]?.active_subscription ?? false;
}

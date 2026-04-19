import { Pool, QueryResult, QueryResultRow } from "pg";

let pool: Pool | null = null;
let initialized = false;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is required.");
    }

    pool = new Pool({
      connectionString,
      ssl:
        process.env.POSTGRES_SSL === "require"
          ? {
              rejectUnauthorized: false
            }
          : undefined
    });
  }

  return pool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

export async function initDb(): Promise<void> {
  if (initialized) {
    return;
  }

  await query(`
    CREATE TABLE IF NOT EXISTS oauth_connections (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      encrypted_token TEXT NOT NULL,
      account_name TEXT,
      scope TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(team_id, provider)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT,
      framework TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(team_id, provider, provider_project_id)
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      summary JSONB
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS scan_results (
      id TEXT PRIMARY KEY,
      scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
      deployment_url TEXT NOT NULL,
      status_code INTEGER,
      gated BOOLEAN NOT NULL,
      gate_reason TEXT,
      page_title TEXT,
      response_ms INTEGER,
      estimated_monthly_visitors INTEGER NOT NULL,
      estimated_lost_customers INTEGER NOT NULL,
      estimated_mrr_loss_cents INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_scan_results_scan_id ON scan_results(scan_id);
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      team_id TEXT,
      lemon_entity_id TEXT UNIQUE NOT NULL,
      email TEXT,
      status TEXT NOT NULL,
      plan_name TEXT,
      renews_at TIMESTAMPTZ,
      raw_payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(LOWER(email));
  `);

  initialized = true;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    initialized = false;
  }
}

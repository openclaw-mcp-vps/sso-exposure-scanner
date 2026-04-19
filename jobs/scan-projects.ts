import cron from "node-cron";

import { closeDb, initDb, query } from "@/lib/database";
import { scanTeam } from "@/lib/scanner";

type TeamRow = {
  team_id: string;
};

async function listRunnableTeams(): Promise<string[]> {
  await initDb();

  const result = await query<TeamRow>(
    `
      SELECT DISTINCT oc.team_id
      FROM oauth_connections oc
      LEFT JOIN subscriptions s ON s.team_id = oc.team_id
      WHERE s.status IS NULL OR s.status = ANY($1::text[])
    `,
    [["active", "on_trial", "trialing", "paid", "renewing"]]
  );

  return result.rows.map((row: { team_id: string }) => row.team_id);
}

async function runScanSweep(): Promise<void> {
  const teams = await listRunnableTeams();

  if (teams.length === 0) {
    console.log(`[scan-jobs] ${new Date().toISOString()} no teams to scan`);
    return;
  }

  console.log(`[scan-jobs] ${new Date().toISOString()} starting scan for ${teams.length} team(s)`);

  for (const teamId of teams) {
    try {
      const result = await scanTeam(teamId);
      console.log(
        `[scan-jobs] team=${teamId} scanned=${result.summary.projectsScanned} blocked=${result.summary.blockedCount}`
      );
    } catch (error) {
      console.error(
        `[scan-jobs] team=${teamId} failed: ${error instanceof Error ? error.message : "unknown error"}`
      );
    }
  }
}

async function bootstrap(): Promise<void> {
  await runScanSweep();

  cron.schedule("*/30 * * * *", async () => {
    await runScanSweep();
  });

  console.log("[scan-jobs] scheduler started, running every 30 minutes");
}

bootstrap().catch(async (error) => {
  console.error("[scan-jobs] fatal startup error", error);
  await closeDb();
  process.exit(1);
});

process.on("SIGINT", async () => {
  await closeDb();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeDb();
  process.exit(0);
});

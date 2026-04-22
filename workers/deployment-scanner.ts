import { getScanQueue } from "@/lib/queue";
import { runDeploymentScan } from "@/lib/scanner";

async function startWorker(): Promise<void> {
  const queue = getScanQueue();

  if (!queue) {
    throw new Error("REDIS_URL is not configured. The deployment scanner worker cannot start.");
  }

  queue.process(async (job) => {
    const { teamId, runId } = job.data;
    await runDeploymentScan(teamId, runId);
  });

  queue.on("completed", (job) => {
    console.log(`Scan completed for run ${job.data.runId}`);
  });

  queue.on("failed", (job, err) => {
    console.error(`Scan failed for run ${job?.data.runId}:`, err);
  });

  console.log("Deployment scanner worker is running and listening for scan jobs.");
}

void startWorker();

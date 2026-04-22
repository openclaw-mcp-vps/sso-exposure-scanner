import Bull from "bull";

export type ScanJobPayload = {
  teamId: string;
  runId: string;
};

let queueInstance: Bull.Queue<ScanJobPayload> | null | undefined;

export function getScanQueue(): Bull.Queue<ScanJobPayload> | null {
  if (queueInstance !== undefined) {
    return queueInstance;
  }

  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    queueInstance = null;
    return queueInstance;
  }

  queueInstance = new Bull<ScanJobPayload>("deployment-scan", redisUrl);
  return queueInstance;
}

export async function enqueueScanJob(payload: ScanJobPayload): Promise<boolean> {
  const queue = getScanQueue();

  if (!queue) {
    return false;
  }

  await queue.add(payload, {
    attempts: 2,
    backoff: {
      type: "fixed",
      delay: 10_000
    },
    removeOnComplete: true,
    removeOnFail: false
  });

  return true;
}

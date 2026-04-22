"use client";

type ScanRun = {
  id: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  totalUrls: number;
  blockedUrls: number;
  estimatedMonthlyMrrLoss: number;
};

type ScanResult = {
  id: string;
  provider: "vercel" | "netlify";
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
};

type ScanResultsProps = {
  run: ScanRun | null;
  results: ScanResult[];
  loading: boolean;
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

export function ScanResults({ run, results, loading }: ScanResultsProps): React.ReactElement {
  if (!run) {
    return (
      <section className="rounded-xl border border-dashed border-[#30363d] bg-[#111827] p-8 text-center">
        <h2 className="text-xl font-semibold text-[#f0f6fc]">No scans yet</h2>
        <p className="mt-2 text-sm text-[#8b949e]">
          Connect at least one provider and run your first scan to reveal blocked deployments.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[#8b949e]">URLs Scanned</p>
          <p className="mt-2 text-3xl font-semibold text-[#f0f6fc]">{run.totalUrls}</p>
        </div>
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[#8b949e]">Blocked URLs</p>
          <p className="mt-2 text-3xl font-semibold text-[#ff7b72]">{run.blockedUrls}</p>
        </div>
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-[#8b949e]">Estimated MRR At Risk</p>
          <p className="mt-2 text-3xl font-semibold text-[#ffa657]">
            {formatMoney(run.estimatedMonthlyMrrLoss)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-[#30363d] bg-[#111827]">
        <table className="min-w-full divide-y divide-[#30363d] text-sm">
          <thead className="bg-[#161b22]">
            <tr className="text-left text-xs uppercase tracking-[0.08em] text-[#8b949e]">
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">URL Status</th>
              <th className="px-4 py-3">Impact</th>
              <th className="px-4 py-3">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#21262d]">
            {results.map((result) => (
              <tr key={result.id}>
                <td className="px-4 py-4 text-[#f0f6fc]">
                  <p className="font-medium">{result.projectName}</p>
                  <a
                    href={result.deploymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs text-[#58a6ff] hover:underline"
                  >
                    {result.deploymentUrl}
                  </a>
                </td>
                <td className="px-4 py-4 text-[#c9d1d9]">{result.provider}</td>
                <td className="px-4 py-4">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      result.isBlocked
                        ? "bg-[#da363326] text-[#ff7b72]"
                        : "bg-[#2ea04326] text-[#3fb950]"
                    }`}
                  >
                    {result.isBlocked ? "Blocked" : "Public"} ({result.statusCode || "ERR"})
                  </span>
                </td>
                <td className="px-4 py-4 text-[#c9d1d9]">
                  {result.isBlocked
                    ? `${result.estimatedLostCustomers} customers · ${formatMoney(result.estimatedMrrLoss)}/mo`
                    : "No immediate leak"}
                </td>
                <td className="px-4 py-4 text-[#8b949e]">{result.blockReason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[#8b949e]">
        Scan run {run.id.slice(0, 8)} started {new Date(run.startedAt).toLocaleString()}. {loading
          ? "Refreshing results…"
          : run.status === "running"
            ? "Scan is still running."
            : "Scan completed."}
      </p>
    </section>
  );
}

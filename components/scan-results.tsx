"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ScanResult = {
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

type LatestScan = {
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

type ScanResultsProps = {
  latestScan: LatestScan | null;
  results: ScanResult[];
};

function currency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(cents / 100);
}

export function ScanResults({ latestScan, results }: ScanResultsProps) {
  const blocked = results.filter((result) => result.gated);

  const chartData = blocked.slice(0, 8).map((item) => ({
    name: item.project_name,
    lost: item.estimated_mrr_loss_cents / 100
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Latest Scan Snapshot</CardTitle>
          <CardDescription>
            {latestScan
              ? `Started ${new Date(latestScan.started_at).toLocaleString()} and analyzed ${latestScan.summary?.projectsScanned ?? 0} deployment URLs.`
              : "Run your first scan to reveal blocked projects and revenue exposure."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {latestScan?.summary ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[#314158] bg-[#0f1825] p-4">
                <p className="text-xs uppercase text-slate-500">Blocked URLs</p>
                <p className="mt-2 text-2xl font-semibold text-rose-300">
                  {latestScan.summary.blockedCount ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-[#314158] bg-[#0f1825] p-4">
                <p className="text-xs uppercase text-slate-500">Estimated Lost Customers</p>
                <p className="mt-2 text-2xl font-semibold text-amber-300">
                  {latestScan.summary.estimatedLostCustomers ?? 0}
                </p>
              </div>
              <div className="rounded-lg border border-[#314158] bg-[#0f1825] p-4">
                <p className="text-xs uppercase text-slate-500">Estimated Monthly Revenue Impact</p>
                <p className="mt-2 text-2xl font-semibold text-sky-300">
                  {currency(latestScan.summary.estimatedMrrLossCents ?? 0)}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No scan summary available yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top At-Risk Projects</CardTitle>
          <CardDescription>Projects where auth walls are likely hiding working product pages.</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-slate-400">No blocked projects detected in the latest scan.</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 4 }}>
                  <CartesianGrid stroke="#25344a" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis
                    stroke="#94a3b8"
                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f1825",
                      border: "1px solid #314158",
                      borderRadius: 8,
                      color: "#e2e8f0"
                    }}
                    formatter={(value: number) => [`$${value.toFixed(0)}`, "Est. lost MRR"]}
                  />
                  <Bar dataKey="lost" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Findings</CardTitle>
          <CardDescription>
            Each deployment URL is tested directly and scored for likely customer impact.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-slate-400">No findings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-1">Project</th>
                    <th className="px-3 py-1">Status</th>
                    <th className="px-3 py-1">Gate</th>
                    <th className="px-3 py-1">Impact</th>
                    <th className="px-3 py-1">URL</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item) => (
                    <tr key={item.id} className="rounded-lg border border-[#243247] bg-[#0f1825]">
                      <td className="px-3 py-3 align-top">
                        <p className="font-semibold text-slate-100">{item.project_name}</p>
                        <p className="text-xs text-slate-500">{item.provider}</p>
                      </td>
                      <td className="px-3 py-3 align-top text-slate-300">
                        {item.status_code ?? "No response"}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="space-y-1">
                          <Badge variant={item.gated ? "danger" : "success"}>
                            {item.gated ? "Blocked" : "Public"}
                          </Badge>
                          <p className="text-xs text-slate-500">{item.gate_reason}</p>
                        </div>
                      </td>
                      <td className="px-3 py-3 align-top text-slate-300">
                        {item.gated ? currency(item.estimated_mrr_loss_cents) : "$0"}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <a
                          href={item.deployment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-sky-300 hover:text-sky-200"
                        >
                          {item.deployment_url}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

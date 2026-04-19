"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { ProjectList } from "@/components/project-list";
import { ScanResults } from "@/components/scan-results";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DashboardData = {
  teamId: string;
  connectedProviders: string[];
  projects: Array<{
    id: string;
    provider: "vercel" | "netlify";
    name: string;
    framework: string | null;
    url: string | null;
    updated_at: string;
  }>;
  latestScan: {
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
  } | null;
  results: Array<{
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
  }>;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningScan, setRunningScan] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectedProvider, setConnectedProvider] = useState<string | null>(null);

  const connectedLabel = useMemo(() => {
    if (!data) {
      return "";
    }

    if (data.connectedProviders.length === 0) {
      return "No providers connected";
    }

    return `${data.connectedProviders.length} provider${
      data.connectedProviders.length === 1 ? "" : "s"
    } connected`;
  }, [data]);

  async function loadDashboard(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/scan", {
        method: "GET",
        cache: "no-store"
      });

      const payload = (await response.json()) as DashboardData & { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Could not load dashboard data.");
      }

      setData(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load dashboard data.");
    } finally {
      setLoading(false);
    }
  }

  async function runScan(): Promise<void> {
    setRunningScan(true);
    setError(null);

    try {
      const response = await fetch("/api/scan", {
        method: "POST"
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Scan failed.");
      }

      await loadDashboard();
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Scan failed.");
    } finally {
      setRunningScan(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setConnectedProvider(params.get("connected"));
  }, []);

  useEffect(() => {
    const poll = setInterval(() => {
      void loadDashboard();
    }, 15_000);

    return () => clearInterval(poll);
  }, []);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-6 py-10">
      <header className="flex flex-col gap-4 rounded-2xl border border-[#26374f] bg-[#101a2a] p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-sky-300">Protected dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-100">SSO Exposure Scanner</h1>
          <p className="mt-2 text-sm text-slate-400">
            Monitor every connected deployment URL and catch customer-facing auth failures before they damage conversion.
          </p>
          {connectedProvider ? (
            <p className="mt-2 text-xs text-emerald-300">
              {connectedProvider} account connected successfully.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/api/auth/vercel">
            <Button variant="outline">Connect Vercel</Button>
          </Link>
          <Link href="/api/auth/netlify">
            <Button variant="outline">Connect Netlify</Button>
          </Link>
          <Button onClick={runScan} disabled={runningScan}>
            {runningScan ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            {runningScan ? "Scanning..." : "Run scan now"}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader className="gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Connection Health</CardTitle>
            <CardDescription>
              {connectedLabel || "Waiting for provider data..."}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant={data?.connectedProviders.includes("vercel") ? "success" : "warning"}>
              Vercel {data?.connectedProviders.includes("vercel") ? "connected" : "missing"}
            </Badge>
            <Badge variant={data?.connectedProviders.includes("netlify") ? "success" : "warning"}>
              Netlify {data?.connectedProviders.includes("netlify") ? "connected" : "missing"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {error ? (
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardContent className="pt-6">
            <p className="text-sm text-rose-200">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {loading && !data ? (
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-sky-300" />
            <p className="text-sm text-slate-400">Loading scanner data...</p>
          </CardContent>
        </Card>
      ) : null}

      {data ? (
        <>
          <ProjectList projects={data.projects} />
          <ScanResults latestScan={data.latestScan} results={data.results} />
        </>
      ) : null}
    </main>
  );
}

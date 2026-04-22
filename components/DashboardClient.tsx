"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ScanResults } from "@/components/ScanResults";

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

type DashboardClientProps = {
  hasAccess: boolean;
  hasConnectedProvider: boolean;
  initialRun: ScanRun | null;
  initialResults: ScanResult[];
};

export function DashboardClient({
  hasAccess,
  hasConnectedProvider,
  initialRun,
  initialResults
}: DashboardClientProps): React.ReactElement {
  const [run, setRun] = useState<ScanRun | null>(initialRun);
  const [results, setResults] = useState<ScanResult[]>(initialResults);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canScan = useMemo(
    () => hasAccess && hasConnectedProvider && !triggering,
    [hasAccess, hasConnectedProvider, triggering]
  );

  const refreshResults = useCallback(async () => {
    if (!hasAccess) {
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/scan/results", {
        method: "GET",
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Failed to refresh scan results.");
      }

      const payload = (await response.json()) as {
        run: ScanRun | null;
        results: ScanResult[];
      };

      setRun(payload.run);
      setResults(payload.results ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to refresh scan results.");
    } finally {
      setLoading(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    if (!hasAccess) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshResults();
    }, 8_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [hasAccess, refreshResults]);

  async function triggerScan(): Promise<void> {
    if (!canScan) {
      return;
    }

    setTriggering(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/scan/trigger", {
        method: "POST"
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Scan trigger failed.");
      }

      await refreshResults();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Scan trigger failed.");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <section className="mt-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#30363d] bg-[#111827] p-4">
        <div>
          <h2 className="text-lg font-semibold text-[#f0f6fc]">Deployment Exposure Scan</h2>
          <p className="mt-1 text-sm text-[#8b949e]">
            Trigger a fresh scan to detect SSO/password gating across connected deployments.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void triggerScan();
          }}
          disabled={!canScan}
          className="rounded-lg bg-[#238636] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2ea043] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {triggering ? "Starting Scan..." : "Run Scan"}
        </button>
      </div>

      {!hasConnectedProvider ? (
        <p className="rounded-lg border border-[#30363d] bg-[#161b22] p-3 text-sm text-[#8b949e]">
          Connect at least one provider above to start scanning.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-lg border border-[#da3633] bg-[#da36331a] p-3 text-sm text-[#ff7b72]">
          {errorMessage}
        </p>
      ) : null}

      <ScanResults run={run} results={results} loading={loading || triggering} />
    </section>
  );
}

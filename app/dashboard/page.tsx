import { ConnectAccount } from "@/components/ConnectAccount";
import { DashboardClient } from "@/components/DashboardClient";
import { PricingCard } from "@/components/PricingCard";
import { getTeamIdFromCookie, hasPaidAccessCookie } from "@/lib/auth";
import { getLatestScan, getTeamConnections, isTeamSubscribed } from "@/lib/database";

export const dynamic = "force-dynamic";

export default async function DashboardPage(): Promise<React.ReactElement> {
  const teamId = await getTeamIdFromCookie();
  const [connections, paidCookie, subscribed] = await Promise.all([
    getTeamConnections(teamId),
    hasPaidAccessCookie(),
    isTeamSubscribed(teamId)
  ]);

  const hasAccess = paidCookie && subscribed;
  const latestScan = hasAccess ? await getLatestScan(teamId) : { run: null, results: [] };

  return (
    <main className="min-h-screen bg-[#0d1117] px-6 py-10 text-[#c9d1d9]">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#58a6ff]">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#f0f6fc]">SSO Exposure Scanner</h1>
            <p className="mt-2 text-sm text-[#8b949e]">
              Team ID: <span className="font-mono text-[#c9d1d9]">{teamId.slice(0, 8)}</span>
            </p>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <ConnectAccount
            provider="Vercel"
            connected={connections.vercelConnected}
            connectedAt={connections.vercelConnectedAt}
            href="/api/auth/vercel"
          />
          <ConnectAccount
            provider="Netlify"
            connected={connections.netlifyConnected}
            connectedAt={connections.netlifyConnectedAt}
            href="/api/auth/netlify"
          />
        </section>

        {!hasAccess ? (
          <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <article className="rounded-xl border border-[#30363d] bg-[#111827] p-6">
              <h2 className="text-2xl font-semibold text-[#f0f6fc]">Unlock the scanner</h2>
              <p className="mt-3 text-sm text-[#8b949e]">
                Your provider connections are saved, but scanning and impact reports are behind the paid
                plan. Complete checkout, then activate access from your Stripe success page.
              </p>
              <p className="mt-4 text-sm text-[#c9d1d9]">
                After payment, visit
                <span className="ml-1 rounded bg-[#161b22] px-2 py-1 font-mono text-xs text-[#58a6ff]">
                  /purchase/success?session_id=...
                </span>
                to set your access cookie.
              </p>
            </article>
            <PricingCard compact />
          </section>
        ) : (
          <DashboardClient
            hasAccess={hasAccess}
            hasConnectedProvider={connections.vercelConnected || connections.netlifyConnected}
            initialRun={latestScan.run}
            initialResults={latestScan.results}
          />
        )}
      </div>
    </main>
  );
}

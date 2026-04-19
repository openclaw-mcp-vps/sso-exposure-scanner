"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ShieldAlert, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";

const BASE_FEATURES = [
  "Unlimited scans across all connected Vercel + Netlify projects",
  "Per-URL gate detection with direct 401/403 checks",
  "Estimated lost-customer and MRR impact scoring",
  "30-minute recurring background scans",
  "Webhook-backed subscription access control"
];

export function PricingCard() {
  const router = useRouter();
  const [purchaseEmail, setPurchaseEmail] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockMessage, setUnlockMessage] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);

  const productId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID;

  useEffect(() => {
    fetch("/api/team")
      .then((response) => response.json())
      .then((payload: { teamId?: string }) => {
        if (payload.teamId) {
          setTeamId(payload.teamId);
        }
      })
      .catch(() => {
        setTeamId(null);
      });
  }, []);

  const checkoutUrl = useMemo(() => {
    if (!productId) {
      return "";
    }

    const url = new URL(`https://checkout.lemonsqueezy.com/buy/${productId}`);
    url.searchParams.set("embed", "1");
    url.searchParams.set("media", "0");
    url.searchParams.set("logo", "0");

    if (teamId) {
      url.searchParams.set("checkout[custom][team_id]", teamId);
    }

    return url.toString();
  }, [productId, teamId]);

  async function unlockAccess(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setUnlocking(true);
    setUnlockMessage(null);

    try {
      const response = await fetch("/api/subscription/unlock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: purchaseEmail })
      });

      const payload = (await response.json()) as { error?: string; unlocked?: boolean };

      if (!response.ok || !payload.unlocked) {
        setUnlockMessage(payload.error ?? "Could not verify your purchase yet.");
        return;
      }

      setUnlockMessage("Purchase verified. Opening your protected dashboard...");
      router.push("/dashboard");
    } catch {
      setUnlockMessage("Network error while verifying purchase.");
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <div className="rounded-2xl border border-sky-500/30 bg-gradient-to-b from-[#101a2a] to-[#0f1520] p-8 shadow-[0_20px_60px_rgba(14,165,233,0.12)]">
      <Script src="https://app.lemonsqueezy.com/js/lemon.js" strategy="afterInteractive" />

      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-sky-300">Pro plan</p>
          <h3 className="mt-2 text-3xl font-semibold text-slate-100">$29/month per team</h3>
          <p className="mt-2 text-sm text-slate-400">
            Pay once, connect your providers, and stop losing users to invisible auth walls.
          </p>
        </div>
        <ShieldAlert className="h-8 w-8 text-sky-300" />
      </div>

      <ul className="space-y-3 text-sm text-slate-200">
        {BASE_FEATURES.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 space-y-3">
        {checkoutUrl ? (
          <a
            href={checkoutUrl}
            className="lemonsqueezy-button inline-flex w-full items-center justify-center rounded-md bg-sky-500 px-4 py-3 text-sm font-semibold text-[#0d1117] transition hover:bg-sky-400"
          >
            <Zap className="mr-2 h-4 w-4" />
            Start protected scans now
          </a>
        ) : (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            Add `NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID` to enable checkout.
          </p>
        )}

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" className="w-full text-slate-300">
              How the impact model works
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Impact Estimate Method</DialogTitle>
              <DialogDescription>
                We score each blocked URL using project entropy, observed response behavior, and conversion assumptions tuned for solo-founder SaaS funnels.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm text-slate-300">
              <p>
                The scanner first confirms whether a deployment is auth-gated (401/403, auth headers, or login-gate content).
              </p>
              <p>
                Then it estimates likely monthly visitors and applies a conservative visitor-to-paid-customer ratio to forecast lost customer count.
              </p>
              <p>
                Revenue impact is shown as monthly recurring revenue at risk so you can prioritize what to unlock first.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <form onSubmit={unlockAccess} className="mt-8 rounded-xl border border-[#2b3a52] bg-[#0c1320] p-4">
        <p className="text-sm font-semibold text-slate-200">Already paid? Unlock this browser session.</p>
        <p className="mt-1 text-xs text-slate-500">
          Enter the same email used at checkout. We verify it against webhook-synced subscriptions and set an access cookie.
        </p>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            value={purchaseEmail}
            onChange={(event) => setPurchaseEmail(event.target.value)}
            placeholder="you@company.com"
            className="h-10 flex-1 rounded-md border border-[#32435d] bg-[#0f1825] px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <Button type="submit" disabled={unlocking}>
            {unlocking ? "Verifying..." : "Unlock Dashboard"}
          </Button>
        </div>

        {unlockMessage ? <p className="mt-3 text-xs text-slate-300">{unlockMessage}</p> : null}
      </form>

      <p className="mt-4 text-center text-xs text-slate-500">
        Questions before purchase? Email support@ssoexposurescanner.com or read the <Link href="#faq" className="text-sky-300 hover:text-sky-200">FAQ</Link>.
      </p>
    </div>
  );
}

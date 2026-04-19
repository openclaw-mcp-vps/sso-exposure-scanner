import Link from "next/link";
import { AlertTriangle, LockKeyhole, Radar, ShieldCheck, TrendingDown } from "lucide-react";

import { PricingCard } from "@/components/pricing-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const problemPoints = [
  "Your marketing pages are public, but your real tool URL silently returns 401 to everyone except your team.",
  "Vercel and Netlify project settings drift over time as teammates copy templates and duplicate deployments.",
  "You lose trial-to-paid conversions because prospects never see the product experience you shipped."
];

const solutionPoints = [
  {
    title: "Connect in minutes",
    description: "Secure OAuth for Vercel and Netlify pulls every production deployment into one scanner.",
    icon: ShieldCheck
  },
  {
    title: "Detect hidden auth walls",
    description:
      "We request each URL directly, identify 401/403 behavior, and flag login-gate responses even when status codes look normal.",
    icon: Radar
  },
  {
    title: "Prioritize by business impact",
    description:
      "Each blocked URL gets a lost-customer and MRR-at-risk estimate so you can fix the worst leaks first.",
    icon: TrendingDown
  }
];

const faqItems = [
  {
    question: "Do you need write access to my deployment accounts?",
    answer:
      "No. The scanner uses read-only OAuth scopes to list projects/deployments and test URL accessibility. It does not modify provider settings."
  },
  {
    question: "How often does scanning run?",
    answer:
      "You can trigger scans on demand from the dashboard, and scheduled background scans run every 30 minutes to catch new exposure quickly."
  },
  {
    question: "How is revenue impact estimated?",
    answer:
      "We combine project-level traffic potential with conservative conversion assumptions to estimate monthly customer and MRR loss from each blocked URL."
  },
  {
    question: "Can small teams use this without SSO setup overhead?",
    answer:
      "Yes. This is built for solo founders and lean teams managing many projects without enterprise IAM tooling."
  }
];

export default function HomePage() {
  return (
    <main>
      <section className="relative overflow-hidden border-b border-[#253449]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-2 lg:items-center">
          <div>
            <Badge variant="info" className="mb-4">
              DevOps Security for Revenue Teams
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-100 sm:text-5xl">
              SSO Exposure Scanner finds the deployments your customers can&apos;t actually access.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-300">
              Connect Vercel + Netlify, scan every project, and uncover public URLs that are secretly protected by SSO/password gates.
            </p>
            <p className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              I discovered 18 of my own shipped tools were 401-gated and invisible. This product exists because that mistake is expensive.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link href="#pricing" className="sm:flex-1">
                <Button className="w-full">Start scanning now</Button>
              </Link>
              <Link href="/dashboard" className="sm:flex-1">
                <Button variant="outline" className="w-full">
                  Open dashboard
                </Button>
              </Link>
            </div>
          </div>

          <Card className="border-sky-500/30 bg-[#0f1825]">
            <CardHeader>
              <CardTitle>What gets caught immediately</CardTitle>
              <CardDescription>Most teams miss these because deployments still look "healthy" in provider dashboards.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-[#2d3d55] bg-[#0d1522] p-4">
                <div className="mb-2 flex items-center gap-2 text-rose-300">
                  <LockKeyhole className="h-4 w-4" />
                  <span className="font-semibold">401/403 protected production pages</span>
                </div>
                <p className="text-sm text-slate-400">
                  URLs linked from docs, onboarding, and emails that fail for non-authenticated visitors.
                </p>
              </div>

              <div className="rounded-lg border border-[#2d3d55] bg-[#0d1522] p-4">
                <div className="mb-2 flex items-center gap-2 text-amber-300">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-semibold">Misconfigured site/password protection</span>
                </div>
                <p className="text-sm text-slate-400">
                  Legacy project templates and copied settings that quietly lock down customer-facing deployments.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {problemPoints.map((point) => (
            <Card key={point} className="bg-[#101a2a]">
              <CardContent className="pt-6 text-sm text-slate-300">{point}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold">How the scanner closes the leak</h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            Built specifically for founders and small teams running 10+ deployments where auth drift creates silent conversion loss.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {solutionPoints.map((item) => (
            <Card key={item.title} className="bg-[#101a2a]">
              <CardHeader>
                <item.icon className="h-5 w-5 text-sky-300" />
                <CardTitle className="mt-3 text-xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-y border-[#253449] bg-[#0e1623] py-16">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 lg:grid-cols-2 lg:items-start">
          <div>
            <h2 className="text-3xl font-semibold">One plan for every project your team ships</h2>
            <p className="mt-3 text-slate-300">
              Designed for builders who have outgrown manual deployment checks but don&apos;t need enterprise security tooling.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-slate-300">
              <li>Includes unlimited providers, projects, and deployment checks.</li>
              <li>Includes recurring background scans and on-demand rescans after every fix.</li>
              <li>Includes team-level subscription access managed by Lemon Squeezy webhooks.</li>
            </ul>
          </div>

          <PricingCard />
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-4xl px-6 py-16">
        <h2 className="text-3xl font-semibold">FAQ</h2>
        <div className="mt-6 space-y-4">
          {faqItems.map((item) => (
            <Card key={item.question} className="bg-[#101a2a]">
              <CardHeader>
                <CardTitle className="text-lg">{item.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400">{item.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}

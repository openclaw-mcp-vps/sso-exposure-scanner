import Link from "next/link";
import { PricingCard } from "@/components/PricingCard";

const painPoints = [
  "Production links shared in docs and onboarding are returning 401 or password gates.",
  "Teams assume deployments are public because CI succeeded, but users see auth blocks.",
  "Revenue drops quietly because trial users never reach your product after clicking marketing links."
];

const outcomes = [
  {
    title: "Connect Once",
    description:
      "OAuth into Vercel and Netlify from one dashboard. We pull every active deployment URL automatically."
  },
  {
    title: "Scan Every URL",
    description:
      "Each deployment is probed for 401/403 responses, auth redirects, and protection markers in the response body."
  },
  {
    title: "Quantify Revenue Risk",
    description:
      "For blocked URLs, we estimate monthly visitors, lost customers, and MRR risk so teams prioritize fixes fast."
  }
];

const faq = [
  {
    question: "How is this different from uptime monitoring?",
    answer:
      "Uptime checks only tell you if a server responds. SSO Exposure Scanner verifies whether users can actually reach your app without hidden auth walls."
  },
  {
    question: "Will this work for teams with dozens of projects?",
    answer:
      "Yes. The scanner is built for solo founders and small teams running many experiments and client tools across both Vercel and Netlify."
  },
  {
    question: "How quickly do I get results after connecting accounts?",
    answer:
      "The first scan starts immediately from the dashboard and updates in near real time as each deployment is checked."
  }
];

export default function HomePage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-[#0d1117] text-[#c9d1d9]">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-16 sm:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="inline-flex rounded-full border border-[#30363d] bg-[#111827] px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-[#58a6ff]">
              DevOps Security for Revenue Teams
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-[#f0f6fc] sm:text-5xl">
              SSO Exposure Scanner finds deployments where auth is silently blocking your customers.
            </h1>
            <p className="mt-6 text-lg text-[#8b949e]">
              I found 18 of my own projects returning auth gates in production. This tool catches the exact
              failure mode before it burns more pipeline.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg bg-[#238636] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2ea043]"
              >
                Open Dashboard
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-lg border border-[#30363d] px-5 py-3 text-sm font-semibold text-[#c9d1d9] transition hover:border-[#58a6ff] hover:text-[#58a6ff]"
              >
                See Pricing
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-[#30363d] bg-gradient-to-b from-[#161b22] to-[#111827] p-6">
            <h2 className="text-lg font-semibold text-[#f0f6fc]">What breaks without visibility</h2>
            <ul className="mt-4 space-y-3 text-sm text-[#c9d1d9]">
              {painPoints.map((item) => (
                <li key={item} className="rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-[#21262d] bg-[#0f141b]">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-3xl font-semibold text-[#f0f6fc]">How teams use it in practice</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {outcomes.map((item) => (
              <article key={item.title} className="rounded-xl border border-[#30363d] bg-[#111827] p-5">
                <h3 className="text-xl font-semibold text-[#f0f6fc]">{item.title}</h3>
                <p className="mt-3 text-sm text-[#8b949e]">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="text-3xl font-semibold text-[#f0f6fc]">Simple pricing for founder-led teams</h2>
            <p className="mt-3 text-[#8b949e]">
              Built for teams shipping across many projects. One subscription covers your team dashboard,
              continuous scans, and impact reporting.
            </p>
          </div>
          <PricingCard />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <h2 className="text-3xl font-semibold text-[#f0f6fc]">FAQ</h2>
        <div className="mt-8 grid gap-4">
          {faq.map((item) => (
            <article key={item.question} className="rounded-xl border border-[#30363d] bg-[#111827] p-5">
              <h3 className="text-lg font-semibold text-[#f0f6fc]">{item.question}</h3>
              <p className="mt-2 text-sm text-[#8b949e]">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

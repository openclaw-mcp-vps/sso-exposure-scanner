import Link from "next/link";

type PricingCardProps = {
  compact?: boolean;
};

export function PricingCard({ compact = false }: PricingCardProps): React.ReactElement {
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "#";

  return (
    <div className="rounded-2xl border border-[#30363d] bg-[#111827] p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <p className="text-sm uppercase tracking-[0.2em] text-[#58a6ff]">SSO Exposure Scanner</p>
      <h3 className="mt-3 text-2xl font-semibold text-[#f0f6fc]">$29 / team / month</h3>
      <p className="mt-2 text-sm text-[#8b949e]">
        Scan every Vercel and Netlify deployment, catch 401-gated URLs, and quantify lost-customer impact.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-[#c9d1d9]">
        <li>Unlimited scans for one team</li>
        <li>Vercel + Netlify OAuth connections</li>
        <li>Blocked URL evidence with projected MRR loss</li>
        <li>Shareable weekly exposure report</li>
      </ul>
      <div className="mt-6 flex gap-3">
        <Link
          href={paymentLink}
          className="inline-flex items-center justify-center rounded-lg bg-[#238636] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2ea043]"
          prefetch={false}
        >
          Buy Access
        </Link>
        {!compact ? (
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-[#30363d] px-4 py-2 text-sm font-semibold text-[#c9d1d9] transition hover:border-[#58a6ff] hover:text-[#58a6ff]"
          >
            Open Dashboard
          </Link>
        ) : null}
      </div>
      <p className="mt-4 text-xs text-[#8b949e]">
        Configure your Stripe Payment Link to redirect to <span className="font-mono">/purchase/success?session_id={'{CHECKOUT_SESSION_ID}'}</span> so access activates automatically.
      </p>
    </div>
  );
}

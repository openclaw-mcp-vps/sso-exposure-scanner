import Link from "next/link";

type SuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function PurchaseSuccessPage({
  searchParams
}: SuccessPageProps): Promise<React.ReactElement> {
  const params = await searchParams;
  const sessionId = params.session_id;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d1117] px-6 text-[#c9d1d9]">
      <section className="w-full max-w-xl rounded-2xl border border-[#30363d] bg-[#111827] p-8">
        <h1 className="text-3xl font-semibold text-[#f0f6fc]">Payment received</h1>
        <p className="mt-3 text-sm text-[#8b949e]">
          Activate your dashboard access cookie to unlock scans and exposure reports.
        </p>

        {sessionId ? (
          <Link
            href={`/api/billing/activate?session_id=${encodeURIComponent(sessionId)}`}
            className="mt-6 inline-flex rounded-lg bg-[#238636] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2ea043]"
          >
            Activate Access
          </Link>
        ) : (
          <p className="mt-6 rounded-lg border border-[#da3633] bg-[#da36331a] p-3 text-sm text-[#ff7b72]">
            This page needs a <span className="font-mono">session_id</span> query param from Stripe checkout.
          </p>
        )}

        <div className="mt-6">
          <Link href="/dashboard" className="text-sm text-[#58a6ff] hover:underline">
            Go to dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}

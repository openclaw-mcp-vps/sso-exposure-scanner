import Link from "next/link";

type ConnectAccountProps = {
  provider: "Vercel" | "Netlify";
  connected: boolean;
  connectedAt: string | null;
  href: string;
};

export function ConnectAccount({
  provider,
  connected,
  connectedAt,
  href
}: ConnectAccountProps): React.ReactElement {
  return (
    <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[#f0f6fc]">{provider}</h3>
          <p className="mt-1 text-sm text-[#8b949e]">
            {connected
              ? `Connected ${connectedAt ? new Date(connectedAt).toLocaleString() : "recently"}`
              : "Not connected yet"}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            connected ? "bg-[#1f6feb26] text-[#58a6ff]" : "bg-[#30363d] text-[#8b949e]"
          }`}
        >
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <Link
        href={href}
        className="mt-5 inline-flex items-center justify-center rounded-lg border border-[#30363d] px-4 py-2 text-sm font-semibold text-[#c9d1d9] transition hover:border-[#58a6ff] hover:text-[#58a6ff]"
      >
        {connected ? `Reconnect ${provider}` : `Connect ${provider}`}
      </Link>
    </div>
  );
}

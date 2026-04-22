import type { Metadata, Viewport } from "next";
import "@/app/globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "SSO Exposure Scanner",
  description:
    "Find Vercel and Netlify deployments that are silently protected by SSO/password gates and estimate monthly customer loss.",
  keywords: [
    "Vercel",
    "Netlify",
    "SSO",
    "auth protection",
    "deployment scanner",
    "devops security",
    "SaaS revenue"
  ],
  openGraph: {
    title: "SSO Exposure Scanner",
    description:
      "Connect Vercel + Netlify, scan every deployment, and catch 401-gated URLs that block paying customers.",
    url: appUrl,
    siteName: "SSO Exposure Scanner",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "SSO Exposure Scanner",
    description:
      "Discover hidden authentication gates on production URLs before they cost you customers."
  }
};

export const viewport: Viewport = {
  themeColor: "#0d1117",
  colorScheme: "dark"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

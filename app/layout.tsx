import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading"
});

const monoFont = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"]
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ssoexposurescanner.com"),
  title: "SSO Exposure Scanner | Find Auth-Gated Vercel & Netlify Deployments",
  description:
    "Connect Vercel and Netlify, scan every deployment for hidden SSO/password protection, and quantify the customer and MRR impact of blocked public URLs.",
  keywords: [
    "Vercel auth scanner",
    "Netlify password protection",
    "SSO exposure",
    "DevOps security",
    "startup conversion leakage"
  ],
  openGraph: {
    title: "SSO Exposure Scanner",
    description:
      "Catch 401-gated deployments before your paying customers bounce. Built for teams running many Vercel and Netlify projects.",
    type: "website",
    url: "https://ssoexposurescanner.com",
    siteName: "SSO Exposure Scanner"
  },
  twitter: {
    card: "summary_large_image",
    title: "SSO Exposure Scanner",
    description:
      "Find Vercel/Netlify projects where auth is silently blocking customers and revenue."
  },
  alternates: {
    canonical: "/"
  }
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${headingFont.variable} ${monoFont.variable}`}>
      <body className="min-h-screen bg-[#0d1117] text-slate-100 antialiased">{children}</body>
    </html>
  );
}

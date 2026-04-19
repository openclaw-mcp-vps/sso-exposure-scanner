# Build Task: sso-exposure-scanner

Build a complete, production-ready Next.js 15 App Router application.

PROJECT: sso-exposure-scanner
HEADLINE: SSO Exposure Scanner — find Vercel/Netlify projects where auth is blocking your paying customers
WHAT: Connect your Vercel + Netlify accounts, we scan every project/deployment for SSO/password protection, show which public URLs are actually 401-gated, estimate lost-customer impact.
WHY: I just discovered 18 of my OWN deployed tools were 401-gated and invisible to users. This is the exact problem I lived today — others have it too.
WHO PAYS: Solo founders + small teams running >10 projects on Vercel
NICHE: devops-security
PRICE: $$29/mo per team/mo

ARCHITECTURE SPEC:
Next.js app with dashboard for connecting Vercel/Netlify accounts via OAuth, background job system to scan deployments for auth protection, and real-time reporting of blocked URLs with customer impact estimates. Uses PostgreSQL for storing scan results and project data, with Lemon Squeezy for subscription management.

PLANNED FILES:
- app/page.tsx
- app/dashboard/page.tsx
- app/api/auth/vercel/route.ts
- app/api/auth/netlify/route.ts
- app/api/scan/route.ts
- app/api/webhooks/lemonsqueezy/route.ts
- lib/vercel-api.ts
- lib/netlify-api.ts
- lib/scanner.ts
- lib/database.ts
- components/project-list.tsx
- components/scan-results.tsx
- components/pricing-card.tsx
- prisma/schema.prisma
- jobs/scan-projects.ts

DEPENDENCIES: next, tailwindcss, prisma, @prisma/client, next-auth, @lemonsqueezy/lemonsqueezy.js, axios, cheerio, node-cron, lucide-react, recharts, @radix-ui/react-dialog, @radix-ui/react-select

REQUIREMENTS:
- Next.js 15 with App Router (app/ directory)
- TypeScript
- Tailwind CSS v4
- shadcn/ui components (npx shadcn@latest init, then add needed components)
- Dark theme ONLY — background #0d1117, no light mode
- Lemon Squeezy checkout overlay for payments
- Landing page that converts: hero, problem, solution, pricing, FAQ
- The actual tool/feature behind a paywall (cookie-based access after purchase)
- Mobile responsive
- SEO meta tags, Open Graph tags
- /api/health endpoint that returns {"status":"ok"}
- NO HEAVY ORMs: Do NOT use Prisma, Drizzle, TypeORM, Sequelize, or Mongoose. If the tool needs persistence, use direct SQL via `pg` (Postgres) or `better-sqlite3` (local), or just filesystem JSON. Reason: these ORMs require schema files and codegen steps that fail on Vercel when misconfigured.
- INTERNAL FILE DISCIPLINE: Every internal import (paths starting with `@/`, `./`, or `../`) MUST refer to a file you actually create in this build. If you write `import { Card } from "@/components/ui/card"`, then `components/ui/card.tsx` MUST exist with a real `export const Card` (or `export default Card`). Before finishing, scan all internal imports and verify every target file exists. Do NOT use shadcn/ui patterns unless you create every component from scratch — easier path: write all UI inline in the page that uses it.
- DEPENDENCY DISCIPLINE: Every package imported in any .ts, .tsx, .js, or .jsx file MUST be
  listed in package.json dependencies (or devDependencies for build-only). Before finishing,
  scan all source files for `import` statements and verify every external package (anything
  not starting with `.` or `@/`) appears in package.json. Common shadcn/ui peers that MUST
  be added if used:
  - lucide-react, clsx, tailwind-merge, class-variance-authority
  - react-hook-form, zod, @hookform/resolvers
  - @radix-ui/* (for any shadcn component)
- After running `npm run build`, if you see "Module not found: Can't resolve 'X'", add 'X'
  to package.json dependencies and re-run npm install + npm run build until it passes.

ENVIRONMENT VARIABLES (create .env.example):
- NEXT_PUBLIC_LEMON_SQUEEZY_STORE_ID
- NEXT_PUBLIC_LEMON_SQUEEZY_PRODUCT_ID
- LEMON_SQUEEZY_WEBHOOK_SECRET

After creating all files:
1. Run: npm install
2. Run: npm run build
3. Fix any build errors
4. Verify the build succeeds with exit code 0

Do NOT use placeholder text. Write real, helpful content for the landing page
and the tool itself. The tool should actually work and provide value.

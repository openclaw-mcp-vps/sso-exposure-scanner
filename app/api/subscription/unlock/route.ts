import { NextRequest, NextResponse } from "next/server";

import { initDb, query } from "@/lib/database";
import { PAYWALL_COOKIE, TEAM_COOKIE } from "@/lib/session";

type UnlockPayload = {
  email?: string;
};

type SubscriptionRow = {
  id: string;
};

const ACTIVE_STATUSES = ["active", "on_trial", "trialing", "paid", "renewing"];

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json().catch(() => ({}))) as UnlockPayload;
  const email = body.email?.trim();

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  await initDb();

  const teamId = request.cookies.get(TEAM_COOKIE)?.value ?? crypto.randomUUID();

  const subscription = await query<SubscriptionRow>(
    `
      SELECT id
      FROM subscriptions
      WHERE LOWER(email) = LOWER($1)
      AND status = ANY($2::text[])
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [email, ACTIVE_STATUSES]
  );

  if (subscription.rowCount === 0) {
    return NextResponse.json(
      {
        error:
          "No active subscription found for that email yet. If you just paid, wait a minute for webhook sync and retry."
      },
      { status: 404 }
    );
  }

  await query(
    `
      UPDATE subscriptions
      SET team_id = $2, updated_at = NOW()
      WHERE id = $1
    `,
    [subscription.rows[0].id, teamId]
  );

  const response = NextResponse.json({ unlocked: true, teamId });
  response.cookies.set(PAYWALL_COOKIE, "active", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/"
  });

  response.cookies.set(TEAM_COOKIE, teamId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
    path: "/"
  });

  return response;
}

import { createHmac, timingSafeEqual } from "crypto";

import { NextRequest, NextResponse } from "next/server";

import { initDb, query } from "@/lib/database";

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: {
      team_id?: string;
    };
  };
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      user_email?: string;
      customer_email?: string;
      email?: string;
      renews_at?: string | null;
      ends_at?: string | null;
      first_subscription_item?: {
        variant_name?: string;
      };
      first_order_item?: {
        product_name?: string;
        variant_name?: string;
      };
    };
  };
};

function mapStatus(eventName: string, status?: string): string {
  if (eventName.includes("cancel") || eventName.includes("expired")) {
    return "cancelled";
  }

  if (eventName.includes("resumed")) {
    return "active";
  }

  return status ?? "active";
}

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return false;
  }

  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expected = Buffer.from(digest, "utf8");
  const incoming = Buffer.from(signature, "utf8");

  if (expected.length !== incoming.length) {
    return false;
  }

  return timingSafeEqual(expected, incoming);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as LemonWebhookPayload;
  const eventName = payload.meta?.event_name ?? "unknown";
  const attributes = payload.data?.attributes ?? {};

  const lemonEntityId = payload.data?.id;
  if (!lemonEntityId) {
    return NextResponse.json({ error: "Missing Lemon entity id." }, { status: 400 });
  }

  const email = attributes.user_email ?? attributes.customer_email ?? attributes.email ?? null;
  const planName =
    attributes.first_subscription_item?.variant_name ??
    attributes.first_order_item?.variant_name ??
    attributes.first_order_item?.product_name ??
    "SSO Exposure Scanner Pro";
  const renewsAt = attributes.renews_at ?? attributes.ends_at ?? null;
  const teamId = payload.meta?.custom_data?.team_id ?? null;
  const status = mapStatus(eventName, attributes.status);

  await initDb();

  await query(
    `
      INSERT INTO subscriptions (
        id,
        team_id,
        lemon_entity_id,
        email,
        status,
        plan_name,
        renews_at,
        raw_payload,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW(), NOW())
      ON CONFLICT (lemon_entity_id)
      DO UPDATE SET
        team_id = COALESCE(EXCLUDED.team_id, subscriptions.team_id),
        email = COALESCE(EXCLUDED.email, subscriptions.email),
        status = EXCLUDED.status,
        plan_name = EXCLUDED.plan_name,
        renews_at = EXCLUDED.renews_at,
        raw_payload = EXCLUDED.raw_payload,
        updated_at = NOW()
    `,
    [
      crypto.randomUUID(),
      teamId,
      lemonEntityId,
      email,
      status,
      planName,
      renewsAt,
      JSON.stringify(payload)
    ]
  );

  return NextResponse.json({ ok: true });
}

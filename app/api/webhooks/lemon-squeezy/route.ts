import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { recordPaidSession } from "@/lib/database";

type StripeEventPayload = {
  id: string;
  type: string;
  data: {
    object: {
      id?: string;
      customer_details?: {
        email?: string | null;
      };
      amount_total?: number | null;
      currency?: string | null;
    };
  };
};

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): boolean {
  const parts = signatureHeader.split(",");
  const timestamp = parts.find((part) => part.startsWith("t="))?.slice(2);
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  return signatures.some((candidate) => {
    const expectedBuffer = Buffer.from(expected, "hex");
    const candidateBuffer = Buffer.from(candidate, "hex");

    if (expectedBuffer.length !== candidateBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, candidateBuffer);
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return NextResponse.json(
      {
        error: "STRIPE_WEBHOOK_SECRET is not configured."
      },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      {
        error: "Missing Stripe signature header."
      },
      { status: 400 }
    );
  }

  const rawBody = await request.text();

  if (!verifyStripeSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json(
      {
        error: "Invalid webhook signature."
      },
      { status: 400 }
    );
  }

  let event: StripeEventPayload;

  try {
    event = JSON.parse(rawBody) as StripeEventPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const sessionId = event.data.object.id;

    if (sessionId) {
      await recordPaidSession({
        sessionId,
        customerEmail: event.data.object.customer_details?.email ?? null,
        amountTotalCents:
          typeof event.data.object.amount_total === "number" ? event.data.object.amount_total : null,
        currency: event.data.object.currency ?? null,
        rawEvent: event
      });
    }
  }

  return NextResponse.json({ received: true });
}

import { NextResponse } from "next/server";
import { createClient } from "redis";
import { pingDatabase } from "@/lib/database";

export async function GET(): Promise<NextResponse> {
  try {
    await pingDatabase();

    if (process.env.REDIS_URL) {
      const client = createClient({ url: process.env.REDIS_URL });
      await client.connect();
      await client.ping();
      await client.quit();
    }
  } catch (error) {
    console.error("Health check dependency warning:", error);
  }

  return NextResponse.json({ status: "ok" });
}

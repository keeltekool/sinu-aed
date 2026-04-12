import { NextResponse } from "next/server";
import { aggregateDeals } from "../../../lib/deals";
import { getCached } from "../../../lib/cache";
import type { DealsResponse } from "../../../lib/types";

export async function GET() {
  try {
    const response = await getCached<DealsResponse>(
      "deals:all",
      aggregateDeals,
      3600
    );

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Deals failed:", msg);
    return NextResponse.json(
      { error: "Deals failed", detail: msg },
      { status: 500 }
    );
  }
}

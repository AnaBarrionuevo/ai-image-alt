import { NextResponse } from "next/server";

import { runDescriptionGeneration } from "@/lib/pipeline/run-description-generation";

export async function POST(req: Request) {
  try {
    let limit: number | undefined;
    const body = await req.json().catch(() => ({}));
    if (typeof body?.limit === "number" && body.limit > 0) {
      limit = body.limit;
    }

    const results = await runDescriptionGeneration({ limit });

    return NextResponse.json({
      ok: true,
      count: results.length,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/generate-descriptions]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

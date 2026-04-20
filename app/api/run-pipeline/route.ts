import { NextResponse } from "next/server";

import { runFullPipeline } from "@/lib/pipeline/run-full-pipeline";

export async function POST(req: Request) {
  try {
    let limit: number | undefined;
    const body = await req.json().catch(() => ({}));
    if (typeof body?.limit === "number" && body.limit > 0) {
      limit = body.limit;
    }

    const results = await runFullPipeline({
      limit,
      locale: typeof body?.locale === "string" ? body.locale : undefined,
      publish: typeof body?.publish === "boolean" ? body.publish : undefined,
    });

    return NextResponse.json({
      ok: true,
      count: results.length,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/run-pipeline]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

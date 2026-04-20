import { NextResponse } from "next/server";

import { fetchPublishedImageRefs } from "@/lib/pipeline/fetch-image-refs";

export async function GET() {
  try {
    const refs = await fetchPublishedImageRefs();

    for (const { id, url } of refs) {
      console.log("[api/read-all]", { id, url });
    }

    return NextResponse.json({
      ok: true,
      count: refs.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/read-all]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

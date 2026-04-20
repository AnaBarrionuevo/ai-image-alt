import { NextResponse } from "next/server";

import { pushDescriptionsToContentful } from "@/lib/pipeline/push-descriptions-to-contentful";
import type { DescribedImage } from "@/lib/pipeline/types";

type Body = {
  items: DescribedImage[];
  locale?: string;
  publish?: boolean;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Request body must include a non-empty `items` array" },
        { status: 400 },
      );
    }

    await pushDescriptionsToContentful(body.items, {
      locale: body.locale,
      publish: body.publish,
    });

    return NextResponse.json({
      ok: true,
      updated: body.items.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/push-descriptions]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";

import { processPublishedAssetFromWebhook } from "@/lib/pipeline/process-published-asset-from-webhook";
import {
  getContentfulTopic,
  parseAssetIdFromWebhookBody,
  shouldProcessAssetWebhookTopic,
} from "@/lib/webhooks/parse-contentful-asset-webhook";
import {
  assertContentfulWebhookSecretConfigured,
  verifyContentfulWebhookSecret,
} from "@/lib/webhooks/verify-contentful-webhook-secret";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    assertContentfulWebhookSecretConfigured();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Misconfigured webhook";
    console.error("[webhook:contentful]", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  if (!verifyContentfulWebhookSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const topic = getContentfulTopic(req);
  if (!shouldProcessAssetWebhookTopic(topic)) {
    return NextResponse.json({ ok: true, ignored: true, topic });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const assetId = parseAssetIdFromWebhookBody(body);
  if (!assetId) {
    return NextResponse.json(
      { ok: false, error: "Body must be an Asset with sys.id (sys.type === 'Asset')" },
      { status: 400 },
    );
  }

  try {
    const result = await processPublishedAssetFromWebhook(assetId);
    return NextResponse.json({ ok: true, topic, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[webhook:contentful]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

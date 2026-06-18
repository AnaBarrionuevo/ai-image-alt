/**
 * Shared secret check for Contentful webhooks.
 *
 * Configure a **custom header** on the webhook in Contentful, e.g.
 * `X-Webhook-Secret: <same value as CONTENTFUL_WEBHOOK_SECRET>`.
 *
 * Alternatively send `Authorization: Bearer <secret>`.
 */
export function verifyContentfulWebhookSecret(req: Request): boolean {
  const secret = process.env.CONTENTFUL_WEBHOOK_SECRET;
  if (!secret) return false;

  const header = req.headers.get("x-webhook-secret");
  if (header === secret) return true;

  const auth = req.headers.get("authorization");
  const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1];
  return bearer === secret;
}

export function assertContentfulWebhookSecretConfigured(): void {
  if (!process.env.CONTENTFUL_WEBHOOK_SECRET) {
    throw new Error("CONTENTFUL_WEBHOOK_SECRET is not set");
  }
}

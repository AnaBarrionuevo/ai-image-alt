/** `X-Contentful-Topic` values look like `ContentManagement.Asset.publish`. */
export function getContentfulTopic(req: Request): string {
  return req.headers.get("x-contentful-topic") ?? "";
}

export function parseAssetIdFromWebhookBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const sys = b.sys;
  if (!sys || typeof sys !== "object") return null;
  const s = sys as Record<string, unknown>;
  if (s.type !== "Asset") return null;
  return typeof s.id === "string" ? s.id : null;
}

/** Whether this topic should trigger alt-text generation. */
export function shouldProcessAssetWebhookTopic(topic: string): boolean {
  if (!topic) return true;
  if (!topic.includes(".Asset.")) return false;
  if (/\.Asset\.(unpublish|delete|archive)\b/.test(topic)) return false;
  return true;
}

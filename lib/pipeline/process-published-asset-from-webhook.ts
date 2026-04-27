import { fetchPublishedImageRefById } from "./fetch-published-image-ref-by-id";
import { generateDescriptionsForImages } from "./generate-descriptions";
import { pushDescriptionsToContentful } from "./push-descriptions-to-contentful";

export type ProcessPublishedAssetFromWebhookResult =
  | { status: "processed"; assetId: string }
  | { status: "skipped"; assetId: string; reason: string };

/**
 * Read (CDA) → generate (OpenAI) → push (CMA) for a single published image asset.
 */
export async function processPublishedAssetFromWebhook(
  assetId: string,
): Promise<ProcessPublishedAssetFromWebhookResult> {
  const ref = await fetchPublishedImageRefById(assetId);
  if (!ref) {
    return {
      status: "skipped",
      assetId,
      reason:
        "asset_not_in_cda_or_not_image_or_no_url (use Asset.publish webhook, or wait until published)",
    };
  }

  console.log(
    "[webhook:contentful]",
    `Loaded published image asset from CDA: ${assetId}`,
  );

  const [described] = await generateDescriptionsForImages([ref]);
  await pushDescriptionsToContentful([described]);

  console.log(
    "[webhook:contentful]",
    `Finished generate + push for asset ${assetId}`,
  );

  return { status: "processed", assetId };
}

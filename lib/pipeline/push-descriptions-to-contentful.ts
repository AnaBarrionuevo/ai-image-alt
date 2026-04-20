import { getDefaultAssetLocale, updateAssetDescription } from "@/lib/contentful/cma";

import type { DescribedImage } from "./types";

export type PushDescriptionsOptions = {
  locale?: string;
  /** Forwarded to CMA update (default: true unless env says otherwise). */
  publish?: boolean;
};

/**
 * Writes generated descriptions into each asset’s **Description** field via CMA.
 */
export async function pushDescriptionsToContentful(
  images: DescribedImage[],
  options?: PushDescriptionsOptions,
): Promise<void> {
  const locale = options?.locale ?? getDefaultAssetLocale();

  if (images.length === 0) {
    console.log("[pipeline:push]", "Nothing to push (no descriptions).");
    return;
  }

  for (const { id, description } of images) {
    await updateAssetDescription(id, description, locale, {
      publish: options?.publish,
    });
  }

  console.log(
    "[pipeline:push]",
    `Successfully wrote ${images.length} description(s) to Contentful (locale: ${locale}).`,
  );
}

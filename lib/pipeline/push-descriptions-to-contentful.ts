import { getDefaultAssetLocale, updateAssetDescription } from "@/lib/contentful/cma";
import { mapWithConcurrency } from "@/lib/utils/map-with-concurrency";

import type { DescribedImage } from "./types";

export type PushDescriptionsOptions = {
  locale?: string;
  /** Forwarded to CMA update (default: true unless env says otherwise). */
  publish?: boolean;
};

function getPushMaxConcurrency(): number {
  const raw = process.env.CONTENTFUL_PUSH_MAX_CONCURRENCY;
  if (!raw) return 2;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return 2;
  return Math.max(1, Math.min(8, n));
}

/**
 * Writes generated descriptions into each asset’s **Description** field via CMA.
 */
export async function pushDescriptionsToContentful(
  images: DescribedImage[],
  options?: PushDescriptionsOptions,
): Promise<void> {
  const locale = options?.locale ?? getDefaultAssetLocale();
  const toUpdate = images.filter((image) => image.status === "generated");
  const skipped = images.length - toUpdate.length;

  if (toUpdate.length === 0) {
    console.log("[pipeline:push]", "Nothing to push (no descriptions).");
    return;
  }

  const concurrency = getPushMaxConcurrency();
  await mapWithConcurrency(toUpdate, concurrency, async ({ id, description }) => {
    await updateAssetDescription(id, description, locale, {
      publish: options?.publish,
    });
  });

  console.log(
    "[pipeline:push]",
    `Successfully wrote ${toUpdate.length} description(s) to Contentful (locale: ${locale}, concurrency=${concurrency}). Skipped ${skipped} asset(s) with existing descriptions.`,
  );
}

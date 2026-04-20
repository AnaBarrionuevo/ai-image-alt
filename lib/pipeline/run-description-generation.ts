import { fetchPublishedImageRefs } from "./fetch-image-refs";
import { generateDescriptionsForImages } from "./generate-descriptions";

import type { DescribedImage } from "./types";

const MAX_LIMIT = 500;

export type RunDescriptionGenerationOptions = {
  /** Process at most this many images (after fetching the full list). */
  limit?: number;
};

/**
 * Shared entry: load image refs from Contentful, optionally cap count, generate descriptions.
 * Use from API routes, CLI, or a future full pipeline (read → generate → CMA).
 */
export async function runDescriptionGeneration(
  options?: RunDescriptionGenerationOptions,
): Promise<DescribedImage[]> {
  let images = await fetchPublishedImageRefs();

  if (options?.limit !== undefined && options.limit > 0) {
    const cap = Math.min(options.limit, MAX_LIMIT);
    images = images.slice(0, cap);
    console.log(
      "[pipeline]",
      `Applying limit: processing ${images.length} image(s) (max ${cap}).`,
    );
  }

  return generateDescriptionsForImages(images);
}

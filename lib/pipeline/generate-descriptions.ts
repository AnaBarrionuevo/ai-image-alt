import { describeImageFromUrl } from "@/lib/openai/describe-image";

import type { DescribedImage, ImageRef } from "./types";

/**
 * Calls OpenAI vision for each image sequentially (predictable rate limits).
 * Swap for parallel + concurrency limit if you need throughput later.
 */
export async function generateDescriptionsForImages(
  images: ImageRef[],
): Promise<DescribedImage[]> {
  const results: DescribedImage[] = [];

  for (const image of images) {
    const description = await describeImageFromUrl(image.url);
    results.push({ ...image, description });
    console.log("[pipeline:generate]", {
      id: image.id,
      description,
    });
  }

  return results;
}

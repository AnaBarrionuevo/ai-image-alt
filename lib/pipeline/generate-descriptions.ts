import { describeImageFromUrl } from "@/lib/openai/describe-image";
import { mapWithConcurrency } from "@/lib/utils/map-with-concurrency";

import type { DescribedImage, ImageRef } from "./types";

function getOpenAiMaxConcurrency(): number {
  const raw = process.env.OPENAI_MAX_CONCURRENCY;
  if (!raw) return 3;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return 3;
  return Math.max(1, Math.min(10, n));
}

export async function generateDescriptionsForImages(
  images: ImageRef[],
): Promise<DescribedImage[]> {
  const concurrency = getOpenAiMaxConcurrency();
  const results = await mapWithConcurrency(images, concurrency, async (image) => {
    if (image.existingDescription?.trim()) {
      const skipped: DescribedImage = {
        ...image,
        description: image.existingDescription,
        tokensUsed: null,
        status: "skipped",
      };
      console.log("[pipeline:generate]", {
        id: image.id,
        status: "skipped",
        reason: "already_has_description",
      });
      return skipped;
    }

    const { description, tokensUsed } = await describeImageFromUrl(image.url);
    const generated: DescribedImage = {
      ...image,
      description,
      tokensUsed,
      status: "generated",
    };
    console.log("[pipeline:generate]", {
      id: image.id,
      description,
      tokensUsed,
      status: "generated",
    });
    return generated;
  });

  const generatedCount = results.filter((item) => item.status === "generated").length;
  console.log(
    "[pipeline:generate]",
    `Completed ${results.length} asset(s) with OpenAI concurrency=${concurrency}. Generated ${generatedCount}, skipped ${results.length - generatedCount}.`,
  );

  return results;
}

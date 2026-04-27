import { describeImageFromUrl } from "@/lib/openai/describe-image";
import { getDefaultAssetLocale, updateAssetDescription } from "@/lib/contentful/cma";
import { mapWithConcurrency } from "@/lib/utils/map-with-concurrency";
import { fetchPublishedImageRefs } from "./fetch-image-refs";
import type { DescribedImage } from "./types";

export type StreamEvent =
  | { type: "start"; total: number }
  | { type: "asset"; data: DescribedImage }
  | { type: "done"; total: number; generated: number; skipped: number }
  | { type: "error"; message: string };

export type StreamingPipelineOptions = {
  limit?: number;
  locale?: string;
  publish?: boolean;
};

function getMaxConcurrency(): number {
  const raw = process.env.OPENAI_MAX_CONCURRENCY;
  if (!raw) return 3;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(1, Math.min(10, n)) : 3;
}

/**
 * Processes each asset end-to-end (generate → push) and emits an event
 * per asset as soon as it completes. Callers see results incrementally
 * rather than waiting for the whole batch to finish.
 */
export async function runStreamingPipeline(
  options: StreamingPipelineOptions | undefined,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const locale = options?.locale ?? getDefaultAssetLocale();
  const publish = options?.publish;

  let refs = await fetchPublishedImageRefs();
  if (options?.limit && options.limit > 0) {
    refs = refs.slice(0, options.limit);
  }

  onEvent({ type: "start", total: refs.length });

  let generated = 0;
  let skipped = 0;

  await mapWithConcurrency(refs, getMaxConcurrency(), async (image) => {
    let result: DescribedImage;

    if (image.existingDescription?.trim()) {
      result = {
        ...image,
        description: image.existingDescription,
        tokensUsed: null,
        status: "skipped",
      };
      skipped++;
      console.log("[pipeline:stream]", { id: image.id, status: "skipped" });
    } else {
      const { description, tokensUsed } = await describeImageFromUrl(image.url);
      await updateAssetDescription(image.id, description, locale, { publish });
      result = { ...image, description, tokensUsed, status: "generated" };
      generated++;
      console.log("[pipeline:stream]", { id: image.id, tokensUsed, status: "generated" });
    }

    onEvent({ type: "asset", data: result });
  });

  console.log(
    "[pipeline:stream]",
    `Done. total=${refs.length} generated=${generated} skipped=${skipped}`,
  );

  onEvent({ type: "done", total: refs.length, generated, skipped });
}

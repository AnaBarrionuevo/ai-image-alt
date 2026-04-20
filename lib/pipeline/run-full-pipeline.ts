import { pushDescriptionsToContentful, type PushDescriptionsOptions } from "./push-descriptions-to-contentful";
import {
  runDescriptionGeneration,
  type RunDescriptionGenerationOptions,
} from "./run-description-generation";

import type { DescribedImage } from "./types";

export type RunFullPipelineOptions = RunDescriptionGenerationOptions &
  PushDescriptionsOptions;

/**
 * Contentful (read) → OpenAI (describe) → Contentful CMA (write description + publish).
 */
export async function runFullPipeline(
  options?: RunFullPipelineOptions,
): Promise<DescribedImage[]> {
  const described = await runDescriptionGeneration(options);
  await pushDescriptionsToContentful(described, options);
  return described;
}

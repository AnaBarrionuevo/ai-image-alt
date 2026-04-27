import {
  createCdaClient,
  getAllImageAssets,
  getAssetDescription,
  getAssetFileUrl,
} from "@/lib/contentful/cda";

import type { ImageRef } from "./types";

/** Published image assets from Contentful CDA (id + HTTPS file URL). */
export async function fetchPublishedImageRefs(): Promise<ImageRef[]> {
  const client = createCdaClient();
  const assets = await getAllImageAssets(client);
  const refs: ImageRef[] = [];

  for (const asset of assets) {
    const url = getAssetFileUrl(asset);
    if (url) {
      refs.push({
        id: asset.sys.id,
        url,
        existingDescription: getAssetDescription(asset),
      });
    }
  }

  console.log(
    "[pipeline:read]",
    `Successfully read ${refs.length} image asset(s) from Contentful (CDA).`,
  );

  return refs;
}

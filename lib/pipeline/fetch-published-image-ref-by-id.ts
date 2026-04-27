import {
  createCdaClient,
  getAssetDescription,
  getAssetFileUrl,
} from "@/lib/contentful/cda";

import type { Asset, AssetFile } from "contentful";

import type { ImageRef } from "./types";

function fileContentType(file: unknown): string | null {
  if (!file || typeof file !== "object") return null;
  const f = file as AssetFile;
  return typeof f.contentType === "string" ? f.contentType : null;
}

function isCdaImageAsset(asset: Asset): boolean {
  const fileField = asset.fields.file;
  if (!fileField || typeof fileField !== "object") return false;

  if ("contentType" in fileField) {
    const ct = fileContentType(fileField);
    return ct?.startsWith("image/") ?? false;
  }

  for (const value of Object.values(fileField)) {
    const ct = fileContentType(value);
    if (ct?.startsWith("image/")) return true;
  }

  return false;
}

/**
 * Loads one **published** asset from CDA. Returns `null` if missing, not an image, or no file URL.
 */
export async function fetchPublishedImageRefById(
  assetId: string,
): Promise<ImageRef | null> {
  const client = createCdaClient();
  let asset: Asset;
  try {
    asset = await client.getAsset(assetId);
  } catch {
    return null;
  }

  if (!isCdaImageAsset(asset)) return null;

  const url = getAssetFileUrl(asset);
  if (!url) return null;

  return {
    id: asset.sys.id,
    url,
    existingDescription: getAssetDescription(asset),
  };
}

import {
  cmaGetAsset,
  cmaPublishAsset,
  cmaUpdateAsset,
} from "@/lib/contentful/cma-fetch";
import { withCmaThrottledRequest } from "@/lib/contentful/cma-rate-limit";

export function getSpaceEnvironmentParams(): {
  spaceId: string;
  environmentId: string;
} {
  const spaceId = process.env.CONTENTFUL_SPACE_ID;
  const environmentId = process.env.CONTENTFUL_ENVIRONMENT ?? "master";
  if (!spaceId) {
    throw new Error("CONTENTFUL_SPACE_ID is not set");
  }
  return { spaceId, environmentId };
}

/** Locale key for asset `description` (and other localized fields). */
export function getDefaultAssetLocale(): string {
  return process.env.CONTENTFUL_DEFAULT_LOCALE ?? "en-US";
}

export type UpdateAssetDescriptionOptions = {
  /** Publish after update so Delivery / CDN see the new description (default: true unless CONTENTFUL_PUBLISH_AFTER_UPDATE=false). */
  publish?: boolean;
};

/**
 * Sets `fields.description[locale]` on a media asset and updates via CMA.
 * Uses native fetch (undici) — no axios, no EventEmitter listener buildup.
 */
export async function updateAssetDescription(
  assetId: string,
  description: string,
  locale: string,
  options?: UpdateAssetDescriptionOptions,
): Promise<void> {
  const { spaceId, environmentId } = getSpaceEnvironmentParams();

  const asset = await withCmaThrottledRequest(`asset.get(${assetId})`, () =>
    cmaGetAsset(spaceId, environmentId, assetId),
  );

  if (!asset.fields.description) {
    asset.fields.description = {};
  }
  asset.fields.description[locale] = description;

  const updated = await withCmaThrottledRequest(`asset.update(${assetId})`, () =>
    cmaUpdateAsset(spaceId, environmentId, assetId, asset),
  );

  const envPublish = process.env.CONTENTFUL_PUBLISH_AFTER_UPDATE;
  const shouldPublish =
    options?.publish ?? (envPublish === undefined ? true : envPublish !== "false");

  if (shouldPublish) {
    await withCmaThrottledRequest(`asset.publish(${assetId})`, () =>
      cmaPublishAsset(spaceId, environmentId, assetId, updated.sys.version),
    );
  }
}

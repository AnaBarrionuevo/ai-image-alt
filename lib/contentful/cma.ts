import { createClient, type PlainClientAPI } from "contentful-management";

export function createCmaClient(): PlainClientAPI {
  const accessToken = process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("CONTENTFUL_MANAGEMENT_ACCESS_TOKEN is not set");
  }
  return createClient({ accessToken });
}

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
 * Sets `fields.description[locale]` on a media asset and updates via CMA (plain client).
 */
export async function updateAssetDescription(
  assetId: string,
  description: string,
  locale: string,
  options?: UpdateAssetDescriptionOptions,
): Promise<void> {
  const client = createCmaClient();
  const { spaceId, environmentId } = getSpaceEnvironmentParams();

  const asset = await client.asset.get({
    spaceId,
    environmentId,
    assetId,
  });

  if (!asset.fields.description) {
    asset.fields.description = {};
  }
  asset.fields.description[locale] = description;

  const updated = await client.asset.update(
    { spaceId, environmentId, assetId },
    asset,
  );

  const envPublish = process.env.CONTENTFUL_PUBLISH_AFTER_UPDATE;
  const shouldPublish =
    options?.publish ?? (envPublish === undefined ? true : envPublish !== "false");

  if (shouldPublish) {
    await client.asset.publish(
      { spaceId, environmentId, assetId },
      updated,
    );
  }
}

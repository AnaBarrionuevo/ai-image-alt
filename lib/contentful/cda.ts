import { createClient, type Asset, type AssetFile } from "contentful";

export function createCdaClient() {
  const space = process.env.CONTENTFUL_SPACE_ID;
  const accessToken = process.env.CONTENTFUL_DELIVERY_ACCESS_TOKEN;
  const environment = process.env.CONTENTFUL_ENVIRONMENT ?? "master";

  if (!space || !accessToken) {
    throw new Error(
      "CONTENTFUL_SPACE_ID and CONTENTFUL_DELIVERY_ACCESS_TOKEN must be set",
    );
  }

  return createClient({ space, accessToken, environment });
}

function normalizeAssetUrl(url: string): string {
  return url.startsWith("//") ? `https:${url}` : url;
}

/**
 * Resolves the file URL for an asset. The CDA can return `fields.file` either
 * as a flat {@link AssetFile} (default locale) or as a per-locale map.
 */
export function getAssetFileUrl(asset: Asset): string | null {
  const fileField = asset.fields.file;
  if (!fileField || typeof fileField !== "object") return null;

  // Single resolved file: { url, details, fileName, contentType, ... }
  if (
    "url" in fileField &&
    typeof (fileField as AssetFile).url === "string"
  ) {
    return normalizeAssetUrl((fileField as AssetFile).url);
  }

  // Localized: { "en-US": { url, ... }, ... }
  for (const value of Object.values(fileField)) {
    if (
      value &&
      typeof value === "object" &&
      "url" in value &&
      typeof (value as AssetFile).url === "string"
    ) {
      return normalizeAssetUrl((value as AssetFile).url);
    }
  }

  return null;
}

const PAGE_SIZE = 100;

/** All assets with mimetype group `image` (paginated). */
export async function getAllImageAssets(client: ReturnType<typeof createClient>) {
  const items: Asset[] = [];
  let skip = 0;

  for (;;) {
    const res = await client.getAssets({
      mimetype_group: "image",
      limit: PAGE_SIZE,
      skip,
      order: ["sys.createdAt"],
    });
    items.push(...res.items);
    if (skip + res.items.length >= res.total) break;
    skip += PAGE_SIZE;
  }

  return items;
}

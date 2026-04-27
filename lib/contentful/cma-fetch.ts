import { Agent, fetch as undiciFetch } from "undici";

// Single connection pool shared by all CMA calls in this process.
const CMA_BASE = "https://api.contentful.com";

let agent: Agent | null = null;

function getAgent(): Agent {
  if (agent) return agent;
  agent = new Agent({
    connections: 8,
    pipelining: 0,
  });
  return agent;
}

function getManagementToken(): string {
  const token = process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN;
  if (!token) throw new Error("CONTENTFUL_MANAGEMENT_ACCESS_TOKEN is not set");
  return token;
}

function cmaHeaders(version?: number): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getManagementToken()}`,
    "Content-Type": "application/vnd.contentful.management.v1+json",
    Accept: "application/json",
  };
  if (version !== undefined) {
    headers["X-Contentful-Version"] = String(version);
  }
  return headers;
}

export type CmaAsset = {
  sys: {
    id: string;
    version: number;
    space: { sys: { id: string } };
    environment: { sys: { id: string } };
  };
  fields: {
    title?: Record<string, string>;
    description?: Record<string, string>;
    file?: Record<string, { url?: string; contentType?: string; fileName?: string; details?: Record<string, unknown> }>;
  };
};

async function cmaFetch<T>(
  path: string,
  init: RequestInit & { dispatcher?: Agent },
): Promise<T> {
  const res = await undiciFetch(`${CMA_BASE}${path}`, {
    ...init,
    dispatcher: getAgent(),
  } as Parameters<typeof undiciFetch>[1]);

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = await res.text(); }
    const err = new Error(
      typeof body === "object" && body !== null && "message" in body
        ? String((body as Record<string, unknown>).message)
        : `CMA ${init.method ?? "GET"} ${path} failed with status ${res.status}`,
    );
    (err as unknown as Record<string, unknown>).status = res.status;
    (err as unknown as Record<string, unknown>).body = body;
    throw err;
  }

  return res.json() as Promise<T>;
}

export async function cmaGetAsset(
  spaceId: string,
  environmentId: string,
  assetId: string,
): Promise<CmaAsset> {
  return cmaFetch<CmaAsset>(
    `/spaces/${spaceId}/environments/${environmentId}/assets/${assetId}`,
    { method: "GET", headers: cmaHeaders() },
  );
}

export async function cmaUpdateAsset(
  spaceId: string,
  environmentId: string,
  assetId: string,
  asset: CmaAsset,
): Promise<CmaAsset> {
  return cmaFetch<CmaAsset>(
    `/spaces/${spaceId}/environments/${environmentId}/assets/${assetId}`,
    {
      method: "PUT",
      headers: cmaHeaders(asset.sys.version),
      body: JSON.stringify({ fields: asset.fields }),
    },
  );
}

export async function cmaPublishAsset(
  spaceId: string,
  environmentId: string,
  assetId: string,
  version: number,
): Promise<CmaAsset> {
  return cmaFetch<CmaAsset>(
    `/spaces/${spaceId}/environments/${environmentId}/assets/${assetId}/published`,
    {
      method: "PUT",
      headers: cmaHeaders(version),
    },
  );
}

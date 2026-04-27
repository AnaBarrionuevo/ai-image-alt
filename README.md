# AI Image Alt

Next.js app that:

1. reads image assets from Contentful (CDA),
2. generates alt-style descriptions with OpenAI vision,
3. writes descriptions back to Contentful assets via CMA.

## Prerequisites

- Node.js 20+
- A Contentful space with image assets
- Contentful CDA + CMA tokens
- OpenAI API key

## Environment Setup

Create a local env file from the template:

```bash
cp .env.example .env.local
```

Set these values in `.env.local`:

- `CONTENTFUL_SPACE_ID`
- `CONTENTFUL_ENVIRONMENT` (usually `master`)
- `CONTENTFUL_DELIVERY_ACCESS_TOKEN`
- `CONTENTFUL_MANAGEMENT_ACCESS_TOKEN`
- `CONTENTFUL_DEFAULT_LOCALE` (usually `en-US`)
- `CONTENTFUL_PUBLISH_AFTER_UPDATE` (`true` or `false`)
- `CONTENTFUL_CMA_MAX_REQUESTS_PER_SECOND` (optional, default `6`) — throttle CMA calls per process to stay under the 7/s free cap
- `CONTENTFUL_CMA_MAX_RETRIES` (optional, default `8`) — retries after CMA rate limits (429), 1s between attempts
- `OPENAI_MAX_CONCURRENCY` (optional, default `3`) — parallel OpenAI image description requests
- `CONTENTFUL_PUSH_MAX_CONCURRENCY` (optional, default `2`) — number of parallel push workers
- `OPENAI_API_KEY`

Important: if CMA calls return `OrganizationAccessGrantRequired` / `401`, go to Contentful and explicitly authorize the CMA token for the organization/space.

By default the app **throttles** CMA calls (serialized + ~6 req/s) so you usually avoid **429**s. If you still hit the limit (e.g. another client writing at the same time), failed calls wait **1 second** and retry.

CMA requests use native `fetch` backed by an **undici** connection pool — no axios, no `EventEmitter` listener buildup regardless of how many assets you process.

**Skip logic:** Assets that already have a description in Contentful are skipped automatically — no OpenAI call is made and their status shows as `skipped` in the dashboard.

**Bulk requests:** Contentful’s **Bulk Actions** API is mainly for batch workflows like publish/unpublish/validate — it does **not** replace per-asset `get` / `update` / `publish` when you need to change localized fields like `description`. The practical way to reduce retries is **throttling + fewer CMA calls** (e.g. skip `publish` while iterating, or upgrade for a higher CMA rate limit).

## Run Locally

```bash
npm install
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## API Endpoints

- `GET /api/read-all`
  - Reads all image assets from CDA and logs `{ id, url }`.
- `POST /api/generate-descriptions`
  - Generates descriptions from image URLs.
  - Optional body: `{ "limit": 3 }`
- `POST /api/push-descriptions`
  - Pushes provided descriptions to Contentful assets.
  - Body shape:
    - `{ "items": [{ "id": "...", "url": "...", "description": "..." }], "locale": "en-US", "publish": true }`
- `POST /api/run-pipeline`
  - Runs read -> generate -> push in one call.
  - Optional body: `{ "limit": 3, "locale": "en-US", "publish": true }`
- `POST /api/webhooks/contentful`
  - Called by a **Contentful webhook** when an asset changes. Verifies `CONTENTFUL_WEBHOOK_SECRET` via header `X-Webhook-Secret` (or `Authorization: Bearer …`).
  - Expects the webhook **payload** to be an **Asset** JSON (`sys.type === "Asset"`). Triggers generate + push for that asset when it is a **published** image in CDA.
  - Recommended trigger: **`ContentManagement.Asset.publish`** (CDA only sees published assets).

## CLI Commands

- Generate descriptions only:

```bash
npm run generate:descriptions -- --limit 3
```

- Run full pipeline (read -> generate -> push):

```bash
npm run pipeline -- --limit 3
```

Both scripts load `.env.local` automatically.

## Logs

Pipeline logs include:

- `[pipeline:read]` successful read summary
- `[pipeline:generate]` one line per asset — `status: "generated"` or `status: "skipped"` (already had a description)
- `[pipeline:push]` successful Contentful push summary
- `[pipeline:cma]` rate-limit retries (when Contentful throttles)

## Security Notes

- Never commit `.env.local`.
- Rotate tokens immediately if any secret is accidentally exposed.

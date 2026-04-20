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
- `OPENAI_API_KEY`

Important: if CMA calls return `OrganizationAccessGrantRequired` / `401`, go to Contentful and explicitly authorize the CMA token for the organization/space.

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
- `[pipeline:generate]` one line per generated description
- `[pipeline:push]` successful Contentful push summary

## Security Notes

- Never commit `.env.local`.
- Rotate tokens immediately if any secret is accidentally exposed.

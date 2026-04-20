import { loadEnvConfig } from "@next/env";

import { runDescriptionGeneration } from "../lib/pipeline/run-description-generation";

function parseLimit(): number | undefined {
  const idx = process.argv.indexOf("--limit");
  if (idx === -1 || !process.argv[idx + 1]) return undefined;
  const n = parseInt(process.argv[idx + 1], 10);
  if (Number.isNaN(n) || n < 1) {
    throw new Error(`Invalid --limit value: ${process.argv[idx + 1]}`);
  }
  return n;
}

async function main() {
  loadEnvConfig(process.cwd());

  const limit = parseLimit();
  const images = await runDescriptionGeneration({ limit });

  console.error(`Done: ${images.length} description(s).`);
  console.log(JSON.stringify(images, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

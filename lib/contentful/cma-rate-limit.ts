function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as Record<string, unknown>;
  if (typeof e.status === "number") return e.status;
  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";
  const e = error as Record<string, unknown>;
  if (typeof e.message === "string") return e.message;
  return "";
}

/** True when Contentful CMA rejected the call due to per-second rate limits. */
export function isContentfulCmaRateLimitError(error: unknown): boolean {
  const status = getHttpStatus(error);
  if (status === 429) return true;

  const message = `${getErrorMessage(error)} ${String(error)}`.toLowerCase();
  return (
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    (message.includes("exceeded") && message.includes("request"))
  );
}

const DEFAULT_MAX_RETRIES = 8;

let cmaThrottleTail: Promise<unknown> = Promise.resolve();
let lastCmaSlotMs = 0;

function getCmaMaxRequestsPerSecond(): number {
  const raw = process.env.CONTENTFUL_CMA_MAX_REQUESTS_PER_SECOND;
  if (!raw) return 6;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return 6;
  return Math.min(7, Math.max(1, n));
}

/**
 * Serializes CMA traffic and spaces requests to stay under the per-second cap
 * (Free: 7/s). Retries remain a safety net for concurrent writers or bursts.
 */
export async function withCmaThrottledRequest<T>(
  label: string,
  fn: () => Promise<T>,
  options?: { maxRetries?: number },
): Promise<T> {
  const run = async () => {
    const rps = getCmaMaxRequestsPerSecond();
    const minGapMs = 1000 / rps;
    const wait = Math.max(0, minGapMs - (Date.now() - lastCmaSlotMs));
    if (wait > 0) {
      await sleep(wait);
    }
    lastCmaSlotMs = Date.now();
    return withCmaRateLimitRetry(label, fn, options);
  };

  const next = cmaThrottleTail.then(run, run);
  cmaThrottleTail = next.then(
    () => {},
    () => {},
  );
  return next as Promise<T>;
}

/**
 * Runs an async CMA operation; on rate limit, waits **1 second** and retries.
 */
export async function withCmaRateLimitRetry<T>(
  label: string,
  fn: () => Promise<T>,
  options?: { maxRetries?: number },
): Promise<T> {
  const maxRetries =
    options?.maxRetries ??
    (() => {
      const raw = process.env.CONTENTFUL_CMA_MAX_RETRIES;
      if (!raw) return DEFAULT_MAX_RETRIES;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_RETRIES;
    })();

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isContentfulCmaRateLimitError(error) || attempt >= maxRetries) {
        throw error;
      }
      console.warn(
        `[pipeline:cma] ${label}: rate limited, waiting 1s before retry (${attempt + 1}/${maxRetries})`,
      );
      await sleep(1000);
    }
  }
  throw lastError;
}

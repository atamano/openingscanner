export interface FetchRetryOptions {
  backoffs: number[];
  maxRetryAfterMs: number;
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: FetchRetryOptions,
  signal?: AbortSignal,
): Promise<Response> {
  let res = await fetch(url, { ...init, signal });
  for (const base of opts.backoffs) {
    if (res.ok) return res;
    if (res.status !== 429 && res.status < 500) return res;
    const headerDelay = parseRetryAfter(res.headers.get("retry-after"));
    const delayMs =
      headerDelay !== null
        ? Math.min(headerDelay, opts.maxRetryAfterMs)
        : base;
    await sleepOrAbort(delayMs, signal);
    res = await fetch(url, { ...init, signal });
  }
  return res;
}

/**
 * Parse a Retry-After header. RFC 7231 allows two formats:
 *   - delay-seconds (e.g. "120")
 *   - HTTP-date (e.g. "Wed, 21 Oct 2015 07:28:00 GMT")
 * Returns ms, or null when the header is absent / invalid / in the past.
 */
function parseRetryAfter(raw: string | null): number | null {
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  const date = Date.parse(raw);
  if (Number.isFinite(date)) {
    const delta = date - Date.now();
    return delta > 0 ? delta : null;
  }
  return null;
}

export function sleepOrAbort(
  ms: number,
  signal?: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

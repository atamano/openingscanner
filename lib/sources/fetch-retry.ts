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
    const retryAfter = Number(res.headers.get("retry-after"));
    const delayMs =
      Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, opts.maxRetryAfterMs)
        : base;
    await sleepOrAbort(delayMs, signal);
    res = await fetch(url, { ...init, signal });
  }
  return res;
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

// One fetch for every connector: a timeout on each attempt, retries with doubling backoff for a
// timeout, a network failure, a 429 or a server error, and an explicit state for each failure.
// A client error other than 429 is not retried: asking again cannot change the answer.

export type Failure = {
  state: "timeout" | "http_error" | "network_error" | "malformed";
  detail: string;
};

export interface FetchOptions {
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  retries?: number;
  backoffMs?: number;
  timeoutMs?: number;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchRetry(
  url: string,
  {
    fetch: get = fetch,
    sleep = wait,
    retries = 2,
    backoffMs = 500,
    timeoutMs = 15_000,
  }: FetchOptions = {},
): Promise<{ state: "ok"; res: Response } | Failure> {
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let failure: Failure;
    try {
      const res = await get(url, { signal: ctrl.signal });
      if (res.ok) return { state: "ok", res };
      failure = { state: "http_error", detail: `${url} answered ${res.status}` };
      if (res.status < 500 && res.status !== 429) return failure;
    } catch (e) {
      failure = ctrl.signal.aborted
        ? { state: "timeout", detail: `${url} did not answer within ${timeoutMs} ms` }
        : { state: "network_error", detail: `${url}: ${e instanceof Error ? e.message : e}` };
    } finally {
      clearTimeout(timer);
    }
    if (attempt >= retries) return failure;
    await sleep(backoffMs * 2 ** attempt);
  }
}

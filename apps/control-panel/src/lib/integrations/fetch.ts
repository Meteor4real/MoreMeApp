/**
 * Fetch with a hard timeout. Returns the Response on success; rejects
 * with an Error on timeout or network failure (matching native fetch).
 */
export async function timedFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = 8_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

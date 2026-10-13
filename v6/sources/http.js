// one place for fetching JSON, so every source gets the same headers + timeout
export const UA = { 'User-Agent': 'whats-above-me (hobby project)' };

export async function getJson(url, timeoutMs = 15000) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

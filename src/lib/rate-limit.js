/** Small fixed-window limiter. Cloudflare Pages has no free KV requirement for this. */

export function createRateLimiter({ limit = 5, windowMs = 10 * 60 * 1000 } = {}) {
  const hits = new Map();
  return {
    reset() {
      hits.clear();
    },
    allow(key, now = Date.now()) {
      const id = String(key || "unknown");
      const recent = (hits.get(id) || []).filter((time) => now - time < windowMs);
      if (recent.length >= limit) {
        hits.set(id, recent);
        return false;
      }
      recent.push(now);
      hits.set(id, recent);
      return true;
    },
  };
}

export const ipLimiter = createRateLimiter();

export async function allowIp(ip, { limiter, cache, now } = {}) {
  if (limiter) return limiter.allow(ip, now);
  if (cache?.match && cache?.put && ip) {
    const url = `https://operiq.no/__contact-rate/${encodeURIComponent(ip)}`;
    const hit = await cache.match(url);
    const count = hit ? Number(await hit.text()) || 0 : 0;
    if (count >= 5) return false;
    await cache.put(
      url,
      new Response(String(count + 1), { headers: { "cache-control": "public, max-age=600" } }),
    );
    return true;
  }
  return ipLimiter.allow(ip, now);
}

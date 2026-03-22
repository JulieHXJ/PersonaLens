// Simple in-memory cache mapped by normalized URL
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, { timestamp: number, data: any }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour TTL

export function getCache<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  
  if (Date.now() - item.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  
  return item.data as T;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setCache(key: string, data: any) {
  cache.set(key, { timestamp: Date.now(), data });
}

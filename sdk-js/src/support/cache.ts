export interface MiniCache {
  cache: Map<string, any>;
  <T>(key: string, callback: () => T): Promise<T>;
}

export function createCache(): MiniCache {
  const cache = new Map<string, any>()
  const miniCache = async function<T>(key: string, callback: () => T): Promise<T> {
    if (cache.has(key)) {
      return cache.get(key)
    } else {
      const val = await callback()
      cache.set(key, val)
      return val
    }
  }
  miniCache.cache = cache
  return miniCache
}

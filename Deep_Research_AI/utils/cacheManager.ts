import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from './storage';

/**
 * Cache Manager
 * Utilities for monitoring, cleaning, and maintaining the app's cache
 */

// Clear the entire cache (for debugging/reset)
export async function clearAllCache(): Promise<boolean> {
  try {
    console.log('[CacheManager] Clearing all app cache');
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter(key => 
      Object.values(KEYS).some(prefix => key.startsWith(prefix))
    );
    
    console.log(`[CacheManager] Found ${appKeys.length} keys to clear`);
    await AsyncStorage.multiRemove(appKeys);
    return true;
  } catch (error) {
    console.error('[CacheManager] Error clearing cache:', error);
    return false;
  }
}

// Clear specific type of cache
export async function clearCacheByType(type: keyof typeof KEYS): Promise<boolean> {
  try {
    console.log(`[CacheManager] Clearing cache of type: ${type}`);
    const prefix = KEYS[type];
    const keys = await AsyncStorage.getAllKeys();
    const matchingKeys = keys.filter(key => key.startsWith(prefix));
    
    console.log(`[CacheManager] Found ${matchingKeys.length} keys of type ${type} to clear`);
    
    if (matchingKeys.length > 0) {
      await AsyncStorage.multiRemove(matchingKeys);
    }
    return true;
  } catch (error) {
    console.error(`[CacheManager] Error clearing ${type} cache:`, error);
    return false;
  }
}

// Clear expired cache items
export async function clearExpiredCache(maxAge = 7 * 24 * 60 * 60 * 1000): Promise<boolean> {
  try {
    console.log(`[CacheManager] Clearing expired cache items (max age: ${maxAge}ms)`);
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter(key => 
      Object.values(KEYS).some(prefix => key.startsWith(prefix))
    );
    
    const now = new Date().getTime();
    const keysToRemove: string[] = [];
    
    // Check each key
    for (const key of appKeys) {
      const value = await AsyncStorage.getItem(key);
      if (!value) continue;
      
      try {
        const data = JSON.parse(value);
        // Check if the item has a timestamp
        const timestamp = data.cachedAt || data.updatedAt || data.timestamp || data.storedAt;
        if (timestamp) {
          const itemDate = new Date(timestamp).getTime();
          if (now - itemDate > maxAge) {
            keysToRemove.push(key);
          }
        }
      } catch {
        // Skip non-JSON items
      }
    }
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`[CacheManager] Cleared ${keysToRemove.length} expired cache items`);
    } else {
      console.log('[CacheManager] No expired items found');
    }
    
    return true;
  } catch (error) {
    console.error('[CacheManager] Error clearing expired cache:', error);
    return false;
  }
}

// Get cache statistics
export async function getCacheStats(): Promise<{
  totalItems: number,
  totalSize: number,
  itemsByType: Record<string, number>,
  sizeByType: Record<string, number>
}> {
  try {
    console.log('[CacheManager] Getting cache statistics');
    const keys = await AsyncStorage.getAllKeys();
    const appKeys = keys.filter(key => 
      Object.values(KEYS).some(prefix => key.startsWith(prefix))
    );
    
    // Count items by type
    const itemsByType: Record<string, number> = {};
    const sizeByType: Record<string, number> = {};
    let totalSize = 0;
    
    for (const key of appKeys) {
      // Determine the type from the key prefix
      const keyType = Object.entries(KEYS).find(([, prefix]) => 
        key.startsWith(prefix)
      )?.[0] || 'OTHER';
      
      // Increment the count for this type
      itemsByType[keyType] = (itemsByType[keyType] || 0) + 1;
      
      // Get size of this item
      const value = await AsyncStorage.getItem(key);
      if (value) {
        const size = value.length * 2; // Rough estimate: 2 bytes per character
        sizeByType[keyType] = (sizeByType[keyType] || 0) + size;
        totalSize += size;
      }
    }
    
    console.log(`[CacheManager] Found ${appKeys.length} items, total size: ${formatSize(totalSize)}`);
    
    return {
      totalItems: appKeys.length,
      totalSize,
      itemsByType,
      sizeByType
    };
  } catch (error) {
    console.error('[CacheManager] Error getting cache stats:', error);
    return {
      totalItems: 0,
      totalSize: 0,
      itemsByType: {},
      sizeByType: {}
    };
  }
}

/**
 * Get a value from cache or fetch it if not available or expired
 * 
 * @param key Cache key to store/retrieve the data
 * @param fetchFn Function to call to fetch the data if not in cache
 * @param options Optional settings for caching behavior
 * @returns The cached or freshly fetched data
 */
export async function getOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    ttl?: number,
    forceRefresh?: boolean,
    background?: boolean
  } = {}
): Promise<T> {
  const {
    ttl = 5 * 60 * 1000, // Default 5 minutes
    forceRefresh = false,
    background = false
  } = options;

  try {
    // Check if we need to force refresh
    if (!forceRefresh) {
      // Try to get from cache first
      const cachedData = await get<T>(key);
      
      if (cachedData) {
        console.log(`[CacheManager] Cache hit for key: ${key}`);
        
        // If background refresh is enabled and data is about to expire, refresh in background
        const timestamp = cachedData.cachedAt;
        const now = new Date().getTime();
        
        if (background && timestamp && (now - timestamp > ttl * 0.8)) {
          console.log(`[CacheManager] Starting background refresh for key: ${key}`);
          // Fire and forget - don't await
          refreshInBackground(key, fetchFn, ttl);
        }
        
        return cachedData.data;
      }
      
      console.log(`[CacheManager] Cache miss for key: ${key}`);
    } else {
      console.log(`[CacheManager] Force refresh for key: ${key}`);
    }
    
    // Fetch fresh data
    const freshData = await fetchFn();
    
    // Store in cache with timestamp
    await set(key, freshData, ttl);
    
    return freshData;
  } catch (error) {
    console.error(`[CacheManager] Error in getOrFetch for key ${key}:`, error);
    throw error;
  }
}

/**
 * Get a value from cache
 */
async function get<T>(key: string): Promise<{ data: T, cachedAt: number } | null> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (!value) return null;
    
    const { data, cachedAt, expiry } = JSON.parse(value);
    
    // Check if data is expired
    if (expiry && new Date().getTime() > expiry) {
      console.log(`[CacheManager] Expired cache for key: ${key}`);
      return null;
    }
    
    return { data, cachedAt };
  } catch (error) {
    console.error(`[CacheManager] Error getting cache for key ${key}:`, error);
    return null;
  }
}

/**
 * Set a value in cache with TTL
 */
async function set<T>(key: string, data: T, ttl: number): Promise<void> {
  try {
    const now = new Date().getTime();
    const expiry = now + ttl;
    
    const cacheObject = {
      data,
      cachedAt: now,
      expiry
    };
    
    await AsyncStorage.setItem(key, JSON.stringify(cacheObject));
    console.log(`[CacheManager] Cached data for key: ${key}, expires in: ${formatDuration(ttl)}`);
  } catch (error) {
    console.error(`[CacheManager] Error setting cache for key ${key}:`, error);
  }
}

/**
 * Remove a specific cache item
 */
export async function remove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`[CacheManager] Removed cache for key: ${key}`);
  } catch (error) {
    console.error(`[CacheManager] Error removing cache for key ${key}:`, error);
  }
}

/**
 * Clear all cache items that start with a specific prefix
 */
export async function clearByPrefix(prefix: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const matchingKeys = keys.filter(key => key.startsWith(prefix));
    
    if (matchingKeys.length > 0) {
      await AsyncStorage.multiRemove(matchingKeys);
      console.log(`[CacheManager] Cleared ${matchingKeys.length} items with prefix: ${prefix}`);
    }
  } catch (error) {
    console.error(`[CacheManager] Error clearing cache with prefix ${prefix}:`, error);
  }
}

/**
 * Refresh data in background without blocking UI
 */
async function refreshInBackground<T>(key: string, fetchFn: () => Promise<T>, ttl: number): Promise<void> {
  try {
    const freshData = await fetchFn();
    await set(key, freshData, ttl);
    console.log(`[CacheManager] Background refresh completed for key: ${key}`);
  } catch (error) {
    console.error(`[CacheManager] Error in background refresh for key ${key}:`, error);
  }
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60 * 1000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 60 * 60 * 1000) return `${(ms / (60 * 1000)).toFixed(1)}m`;
  return `${(ms / (60 * 60 * 1000)).toFixed(1)}h`;
}

// Format a size in bytes to a human-readable string
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Export a unified cacheManager object with all functions
export const cacheManager = {
  clearAllCache,
  clearCacheByType,
  clearExpiredCache,
  getCacheStats,
  getOrFetch,
  remove,
  clearByPrefix
}; 
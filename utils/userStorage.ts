import { storeData, getData, removeData, KEYS } from './storage';

/**
 * User Profile Storage Module
 * Handles caching of user authentication, preferences, and usage stats
 */

// Auth token interface
export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  userId?: string;
  storedAt?: string;
}

// User preferences interface
export interface UserPreferences {
  theme?: string;
  notifications?: boolean;
  language?: string;
  fontSize?: number;
  accentColor?: string;
  updatedAt?: string;
}

// Usage statistics interface
export interface UsageStats {
  sessionCount?: number;
  lastSessionDate?: string;
  totalResearchCount?: number;
  completedResearchCount?: number;
  averageResearchTime?: number;
  updatedAt?: string;
}

// Store authentication tokens
export async function storeAuthTokens(tokens: AuthTokens): Promise<boolean> {
  console.log('[UserStorage] Storing auth tokens');
  return storeData(`${KEYS.AUTH}tokens`, {
    ...tokens,
    storedAt: new Date().toISOString()
  });
}

// Get authentication tokens
export async function getAuthTokens(): Promise<AuthTokens | null> {
  console.log('[UserStorage] Retrieving auth tokens');
  return getData(`${KEYS.AUTH}tokens`);
}

// Clear authentication data (for logout)
export async function clearAuthData(): Promise<boolean> {
  console.log('[UserStorage] Clearing auth data');
  return removeData(`${KEYS.AUTH}tokens`);
}

// Store user preferences
export async function storeUserPreferences(preferences: UserPreferences): Promise<boolean> {
  console.log('[UserStorage] Storing user preferences');
  const currentPrefs = await getUserPreferences() || {};
  return storeData(`${KEYS.PREFERENCES}user`, {
    ...currentPrefs,
    ...preferences,
    updatedAt: new Date().toISOString()
  });
}

// Get user preferences
export async function getUserPreferences(): Promise<UserPreferences | null> {
  console.log('[UserStorage] Retrieving user preferences');
  return getData(`${KEYS.PREFERENCES}user`);
}

// Store usage statistics
export async function storeUsageStats(stats: UsageStats): Promise<boolean> {
  console.log('[UserStorage] Storing usage stats');
  const current = await getUsageStats() || {};
  
  return storeData(`${KEYS.AUTH}usage`, {
    ...current,
    ...stats,
    updatedAt: new Date().toISOString()
  });
}

// Get usage statistics
export async function getUsageStats(): Promise<UsageStats | null> {
  console.log('[UserStorage] Retrieving usage stats');
  return getData(`${KEYS.AUTH}usage`);
}

// Increment usage counters
export async function incrementUsageStat(statName: string, value = 1): Promise<boolean> {
  console.log(`[UserStorage] Incrementing usage stat: ${statName} by ${value}`);
  const current = await getUsageStats() || {};
  const updatedStats = { 
    ...current,
    [statName]: (current[statName] || 0) + value,
    updatedAt: new Date().toISOString()
  };
  
  return storeData(`${KEYS.AUTH}usage`, updatedStats);
}

// Start a new session
export async function recordSessionStart(): Promise<boolean> {
  console.log('[UserStorage] Recording session start');
  const current = await getUsageStats() || {};
  const sessionCount = (current.sessionCount || 0) + 1;
  
  return storeUsageStats({
    ...current,
    sessionCount,
    lastSessionDate: new Date().toISOString()
  });
}

// Record research start
export async function recordResearchStart(): Promise<boolean> {
  console.log('[UserStorage] Recording research start');
  const current = await getUsageStats() || {};
  const totalResearchCount = (current.totalResearchCount || 0) + 1;
  
  return storeUsageStats({
    ...current,
    totalResearchCount
  });
}

// Record research completion
export async function recordResearchCompletion(durationMs?: number): Promise<boolean> {
  console.log('[UserStorage] Recording research completion');
  const current = await getUsageStats() || {};
  const completedResearchCount = (current.completedResearchCount || 0) + 1;
  
  // Update average research time if duration provided
  let averageResearchTime = current.averageResearchTime || 0;
  if (durationMs && durationMs > 0) {
    const totalTime = averageResearchTime * (completedResearchCount - 1) + durationMs;
    averageResearchTime = totalTime / completedResearchCount;
  }
  
  return storeUsageStats({
    ...current,
    completedResearchCount,
    averageResearchTime
  });
}

// Get all stored user data (for dev/debug purposes)
export async function getAllUserData(): Promise<any> {
  console.log('[UserStorage] Getting all user data for debug');
  const authTokens = await getAuthTokens();
  const preferences = await getUserPreferences();
  const usageStats = await getUsageStats();
  
  return {
    authTokens,
    preferences,
    usageStats
  };
} 
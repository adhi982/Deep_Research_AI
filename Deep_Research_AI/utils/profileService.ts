import { supabase } from './supabase';
import { toast } from 'sonner-native';
import { cacheManager } from './cacheManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Utility service for handling Profile functions with caching
 */

// Cache keys
const CACHE_KEYS = {
  PROFILE_DATA: 'profile_data_',
  USER_EMAIL: 'user_email_',
  USER_SESSION: 'user_session_'
};

// Cache TTL values (in milliseconds)
const CACHE_TTL = {
  PROFILE_DATA: 15 * 60 * 1000, // 15 minutes
  USER_EMAIL: 30 * 60 * 1000, // 30 minutes
  USER_SESSION: 10 * 60 * 1000 // 10 minutes
};

// Types
export interface ProfileData {
  username: string;
  email: string;
  bio: string;
  avatarUrl: string | null;
  id?: string;
}

/**
 * Fetch user profile data with caching
 * 
 * @param options Optional parameters for caching behavior
 * @returns User profile data or null if not available
 */
export async function fetchUserProfileWithCache(
  options = { forceRefresh: false, background: true }
): Promise<ProfileData | null> {
  try {
    // Get current user session to obtain user ID
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      console.log('ProfileService: No user session found');
      return null;
    }

    const userId = session.user.id;
    const cacheKey = `${CACHE_KEYS.PROFILE_DATA}${userId}`;
    
    return await cacheManager.getOrFetch(
      cacheKey,
      () => fetchUserProfileFromApi(userId),
      { 
        ttl: CACHE_TTL.PROFILE_DATA,
        forceRefresh: options.forceRefresh,
        background: options.background 
      }
    );
  } catch (error) {
    console.error('ProfileService: Error fetching user profile with cache:', error);
    return null;
  }
}

/**
 * Internal function to fetch user profile from API
 */
async function fetchUserProfileFromApi(userId: string): Promise<ProfileData | null> {
  try {
    console.log('ProfileService: Fetching user profile from API for user:', userId);
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('ProfileService: User fetch error:', userError);
      throw userError;
    }

    if (!user) {
      console.log('ProfileService: No user found');
      return null;
    }

    // Fetch profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('ProfileService: Profile fetch error:', profileError);
      throw profileError;
    }

    // If profile doesn't exist, create it
    if (!profile) {
      const { error: createError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          username: user.email?.split('@')[0] || '',
          email: user.email,
          avatar_url: null,
          bio: ''
        });

      if (createError) {
        console.error('ProfileService: Profile creation error:', createError);
        throw createError;
      }

      // Fetch the newly created profile
      const { data: newProfile, error: newProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (newProfileError) {
        console.error('ProfileService: New profile fetch error:', newProfileError);
        throw newProfileError;
      }

      return {
        username: newProfile?.username || user.email?.split('@')[0] || '',
        email: user.email || '',
        bio: newProfile?.bio || '',
        avatarUrl: newProfile?.avatar_url,
        id: user.id
      };
    }

    return {
      username: profile?.username || user.email?.split('@')[0] || '',
      email: user.email || '',
      bio: profile?.bio || '',
      avatarUrl: profile?.avatar_url,
      id: user.id
    };
    
  } catch (error) {
    console.error('ProfileService: Error fetching user profile from API:', error);
    return null;
  }
}

/**
 * Fetch user email with caching
 * 
 * @param options Optional parameters for caching behavior
 * @returns User email or null if not available
 */
export async function fetchUserEmailWithCache(
  options = { forceRefresh: false, background: true }
): Promise<string | null> {
  try {
    // Get current user session to obtain user ID
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      console.log('ProfileService: No user session found');
      return null;
    }

    const userId = session.user.id;
    const cacheKey = `${CACHE_KEYS.USER_EMAIL}${userId}`;
    
    return await cacheManager.getOrFetch(
      cacheKey,
      () => fetchUserEmailFromApi(userId),
      { 
        ttl: CACHE_TTL.USER_EMAIL,
        forceRefresh: options.forceRefresh,
        background: options.background 
      }
    );
  } catch (error) {
    console.error('ProfileService: Error fetching user email with cache:', error);
    return null;
  }
}

/**
 * Internal function to fetch user email from API
 */
async function fetchUserEmailFromApi(userId: string): Promise<string | null> {
  try {
    console.log('ProfileService: Fetching user email from API for user:', userId);
    
    // Fetch user data from the users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('ProfileService: User email fetch error:', userError);
      throw userError;
    }

    return userData?.email || null;
    
  } catch (error) {
    console.error('ProfileService: Error fetching user email from API:', error);
    return null;
  }
}

/**
 * Update user profile with cache invalidation
 * 
 * @param profileData The profile data to update
 * @returns Whether the update was successful
 */
export async function updateUserProfile(profileData: Partial<ProfileData>): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      console.log('ProfileService: No user session found for update');
      return false;
    }

    const userId = session.user.id;
    
    // Update profile in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        username: profileData.username,
        bio: profileData.bio,
        avatar_url: profileData.avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('ProfileService: Profile update error:', updateError);
      throw updateError;
    }
    
    // Clear profile cache to force refresh on next fetch
    await clearProfileCache(userId);
    
    return true;
  } catch (error) {
    console.error('ProfileService: Error updating user profile:', error);
    return false;
  }
}

/**
 * Clear profile-related cache
 * 
 * @param userId User ID to clear cache for (optional)
 */
export async function clearProfileCache(userId?: string): Promise<void> {
  try {
    if (userId) {
      // Clear specific user profile cache
      await cacheManager.remove(`${CACHE_KEYS.PROFILE_DATA}${userId}`);
      await cacheManager.remove(`${CACHE_KEYS.USER_EMAIL}${userId}`);
    } else {
      // Clear all profile caches
      await cacheManager.clearByPrefix(CACHE_KEYS.PROFILE_DATA);
      await cacheManager.clearByPrefix(CACHE_KEYS.USER_EMAIL);
    }
  } catch (error) {
    console.error('ProfileService: Error clearing profile cache:', error);
  }
}

/**
 * Log user out and clear all cache
 * 
 * @returns Whether the logout was successful
 */
export async function logoutAndClearCache(): Promise<boolean> {
  try {
    console.log('ProfileService: Logging out and clearing cache');
    
    // Clear all profile-related cache
    await clearProfileCache();
    
    // Clear all research-related cache (if needed)
    try {
      const { clearAllCache } = await import('./cacheManager');
      await clearAllCache();
    } catch (error) {
      console.warn('ProfileService: Error clearing all cache:', error);
      // Continue with logout even if cache clearing fails
    }
    
    // Perform Supabase logout
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('ProfileService: Logout error:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('ProfileService: Error during logout:', error);
    return false;
  }
} 
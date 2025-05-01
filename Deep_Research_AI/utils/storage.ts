import AsyncStorage from '@react-native-async-storage/async-storage';

// Key prefixes for different types of data
export const KEYS = {
  AUTH: '@ResearchApp:Auth:',
  RESEARCH: '@ResearchApp:Research:',
  HISTORY: '@ResearchApp:History:',
  RESULTS: '@ResearchApp:Results:',
  UI_STATE: '@ResearchApp:UIState:',
  CONFIG: '@ResearchApp:Config:',
  PREFERENCES: '@ResearchApp:Preferences:'
};

// Base storage utilities with error handling
export async function storeData(key: string, value: any): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    console.log(`[Storage] Stored data for ${key}`);
    return true;
  } catch (error) {
    console.error(`[Storage] Error storing data for ${key}:`, error);
    return false;
  }
}

export async function getData(key: string): Promise<any> {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value) {
      console.log(`[Storage] Retrieved data for ${key}`);
      return JSON.parse(value);
    }
    console.log(`[Storage] No data found for ${key}`);
    return null;
  } catch (error) {
    console.error(`[Storage] Error retrieving data for ${key}:`, error);
    return null;
  }
}

export async function removeData(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`[Storage] Removed data for ${key}`);
    return true;
  } catch (error) {
    console.error(`[Storage] Error removing data for ${key}:`, error);
    return false;
  }
}

// Get all keys matching a prefix
export async function getAllKeys(prefix: string): Promise<string[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    return allKeys.filter(key => key.startsWith(prefix));
  } catch (error) {
    console.error(`[Storage] Error getting keys with prefix ${prefix}:`, error);
    return [];
  }
} 
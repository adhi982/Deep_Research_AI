import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Storage keys
const NOTIFICATION_TOKEN_KEY = 'notification_token';
const NOTIFICATIONS_ENABLED_KEY = 'notifications_enabled';

/**
 * Register for push notifications and return the token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Check if it's a physical device (not simulator/emulator)
  if (!Device.isDevice) {
    console.log('Push notifications are not available on simulator/emulator');
    return null;
  }

  // Check if notification permissions are granted
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // If permissions are not determined, request them
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  // Return null if permission not granted
  if (finalStatus !== 'granted') {
    console.log('Failed to get push token for push notification!');
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false');
    return null;
  }

  // Get the push token based on platform
  try {
    // Get the project ID from Expo configuration
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    
    // Platform-specific token registration
    let token;
    
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      // For mobile platforms, we can use the standard approach
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: projectId || undefined,
      })).data;
    } else if (Platform.OS === 'web') {
      // For web, we need a VAPID key, but we'll skip this for mobile-only implementation
      console.log('Web push notifications require VAPID key in app.json');
      return null;
    } else {
      // Unknown platform
      console.log(`Push notifications not configured for platform: ${Platform.OS}`);
      return null;
    }
    
    console.log('Push token:', token);
    
    // Store the token in AsyncStorage
    await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'true');
    
    // Store the token in the user's profile in Supabase
    updateTokenInDatabase(token);
    
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Save the notification token to the user's profile in Supabase
 */
export async function updateTokenInDatabase(token: string): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: session.user.id,
          notification_token: token,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      
      if (error) {
        console.error('Error updating notification token in database:', error);
      } else {
        console.log('Successfully updated notification token in database');
      }
    }
  } catch (error) {
    console.error('Error in updateTokenInDatabase:', error);
  }
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Error checking if notifications are enabled:', error);
    return false;
  }
}

/**
 * Toggle notifications on/off
 */
export async function toggleNotifications(enabled: boolean): Promise<boolean> {
  try {
    if (enabled) {
      // If enabling, register for notifications
      const token = await registerForPushNotificationsAsync();
      return token !== null;
    } else {
      // If disabling, just update the settings
      await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false');
      return true;
    }
  } catch (error) {
    console.error('Error toggling notifications:', error);
    return false;
  }
}

/**
 * Send a local notification
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: any
): Promise<void> {
  try {
    const isEnabled = await areNotificationsEnabled();
    if (!isEnabled) {
      console.log('Notifications are disabled');
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
      },
      trigger: null, // null means send immediately
    });
  } catch (error) {
    console.error('Error sending local notification:', error);
  }
}

/**
 * Send a research completion notification
 */
export async function sendResearchCompletionNotification(
  researchId: string,
  query: string
): Promise<void> {
  try {
    // Get the app's URL scheme
    const url = Linking.createURL(`/research-result/${researchId}`);
    
    await sendLocalNotification(
      'Research Complete!',
      `Your research on "${truncateString(query, 40)}" is now complete.`,
      {
        researchId,
        url,
        type: 'research_completion',
      }
    );
  } catch (error) {
    console.error('Error sending research completion notification:', error);
  }
}

/**
 * Handle opening a notification
 */
export function setupNotificationHandler(navigation: any) {
  // Handle notifications that are received while the app is foregrounded
  const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('Notification received in foreground:', notification);
  });

  // Handle notifications that are tapped by the user
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('Notification tapped:', data);
    
    // Handle deep linking based on notification type
    if (data.type === 'research_completion' && data.researchId) {
      navigation.navigate('ResearchResultScreen', {
        research_id: data.researchId,
      });
    }
  });

  // Return cleanup function
  return () => {
    foregroundSubscription.remove();
    responseSubscription.remove();
  };
}

// Helper to truncate long strings
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
} 
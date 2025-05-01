import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Toaster } from 'sonner-native';
import React, { useEffect, useState, useRef } from 'react';
import HomeScreen from "./screens/HomeScreen";
import LoginScreen from "./screens/LoginScreen";
import LandingScreen from "./screens/LandingScreen";
import LandingScreen_1 from "./screens/LandingScreen_1";
import DashboardScreen from "./screens/DashboardScreen";
import ChooseAgentScreen from "./screens/ChooseAgentScreen";
import HistoryScreen from "./screens/HistoryScreen";
import QueueScreen from "./screens/QueueScreen";
import FindStudyScreen from "./screens/FindStudyScreen";
import AgentListScreen from "./screens/AgentListScreen";
import ResearchChatScreen from "./screens/ResearchChatScreen";
import ResearchChatInterface from "./screens/ResearchChatInterface";
import ResearchResultScreen from "./screens/ResearchResultScreen";
import ResearchParametersScreen from "./screens/ResearchParametersScreen";
import ResearchQuestionsScreen from "./screens/ResearchQuestionsScreen";
import ProfileScreen from "./screens/ProfileScreen";
import LogoutScreen from "./screens/LogoutScreen";
import ChangePasswordScreen from "./screens/ChangePasswordScreen";
import GeneralAgentScreen from "./screens/GeneralAgentScreen";
import BusinessAgentScreen from "./screens/BusinessAgentScreen";
import HealthAgentScreen from "./screens/HealthAgentScreen";
import FinancialAgentScreen from "./screens/FinancialAgentScreen";
import PrivacySecurityScreen from "./screens/PrivacySecurityScreen";
import LegalInfoScreen from "./screens/LegalInfoScreen";
import HelpCenterScreen from "./screens/HelpCenterScreen";
import AppErrorBoundary from './components/AppErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { ResearchProvider } from './context/ResearchContext';
import { handleGlobalError, errorHandler, ErrorCategory, ErrorSeverity } from './utils/errorHandler';
import 'react-native-gesture-handler';
import ResearchProgressScreen from "./screens/ResearchProgressScreen";
import SignupScreen from "./screens/SignupScreen";
import DevControlScreen from "./screens/DevControlScreen";
import DevPasswordScreen from "./screens/DevPasswordScreen";
import { UserProvider } from './context/UserContext';
import { recordSessionStart } from './utils/userStorage';
import { clearExpiredCache } from './utils/cacheManager';
import { supabase } from './utils/supabase';
import { ActivityIndicator, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync, setupNotificationHandler } from './utils/notificationService';

// Configure global error handling for unhandled JS errors
if (!__DEV__) {
  // Only in production to avoid interfering with dev tools
  const globalErrorHandler = (error: Error, isFatal?: boolean) => {
    handleGlobalError(error, 'Unhandled JS Exception');
  };
  
  // Set up global error handler
  ErrorUtils.setGlobalHandler(globalErrorHandler);
}

const Stack = createNativeStackNavigator();

function RootStack({ initialRouteName }: { initialRouteName: string }) {
  return (
    <Stack.Navigator 
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="LandingScreen_1" component={LandingScreen_1} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="ChooseAgentScreen" component={ChooseAgentScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Queue" component={QueueScreen} />
      <Stack.Screen name="FindStudyScreen" component={FindStudyScreen} />
      <Stack.Screen name="AgentListScreen" component={AgentListScreen} />
      <Stack.Screen name="ResearchChatScreen" component={ResearchChatScreen} />
      <Stack.Screen 
        name="ResearchQuestionsScreen" 
        component={ResearchQuestionsScreen}
        options={{
          animation: 'slide_from_right',
          presentation: 'card'
        }}
      />
      <Stack.Screen 
        name="ResearchProgressScreen" 
        component={ResearchProgressScreen}
        options={{
          animation: 'slide_from_right',
          presentation: 'card'
        }}
      />
      <Stack.Screen 
        name="ResearchChatInterface" 
        component={ResearchChatInterface}
        options={{
          animation: 'slide_from_right',
          presentation: 'card'
        }}
      />
      <Stack.Screen name="ResearchResultScreen" component={ResearchResultScreen} />
      <Stack.Screen name="ResearchParametersScreen" component={ResearchParametersScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
      <Stack.Screen name="PrivacySecurityScreen" component={PrivacySecurityScreen} />
      <Stack.Screen name="LegalInfoScreen" component={LegalInfoScreen} />
      <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
      <Stack.Screen 
        name="LogoutScreen" 
        component={LogoutScreen}
        options={{
          presentation: 'transparentModal',
          animation: 'fade',
          headerShown: false,
        }}
      />
      <Stack.Screen name="GeneralAgentScreen" component={GeneralAgentScreen} />
      <Stack.Screen name="BusinessAgentScreen" component={BusinessAgentScreen} />
      <Stack.Screen name="HealthAgentScreen" component={HealthAgentScreen} />
      <Stack.Screen name="FinancialAgentScreen" component={FinancialAgentScreen} />
      <Stack.Screen name="DevPasswordScreen" component={DevPasswordScreen} />
      <Stack.Screen name="DevControlScreen" component={DevControlScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initialRouteName, setInitialRouteName] = useState('Landing');
  const navigationRef = useRef(null);

  // Register for push notifications
  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(token => {
        if (token) {
          console.log('Push notification token:', token);
        }
      })
      .catch(err => {
        console.error('Error registering for push notifications:', err);
      });
  }, []);

  // Check for existing session on app start
  useEffect(() => {
    const checkAuthSession = async () => {
      try {
        console.log('[App] Checking for existing session...');
        
        // Get current session from Supabase
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[App] Error checking session:', error);
          setInitialRouteName('Landing');
        } else if (session) {
          console.log('[App] Existing session found, user is logged in');
          setInitialRouteName('Home');
        } else {
          console.log('[App] No session found, redirecting to landing');
          setInitialRouteName('Landing');
        }
      } catch (error) {
        console.error('[App] Unexpected error checking auth session:', error);
        setInitialRouteName('Landing');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuthSession();
  }, []);

  // Handle uncaught promise rejections
  useEffect(() => {
    const rejectionTrackingListener = (event: any, promise: Promise<any>, reason: any) => {
      errorHandler.captureError(
        reason || new Error('Unhandled promise rejection'),
        ErrorCategory.UNKNOWN,
        ErrorSeverity.HIGH,
        { source: 'unhandled_promise_rejection' }
      );
    };
    
    // Setup listeners
    if (!__DEV__) {
      const { addEventListener, removeEventListener } = global as any;
      if (addEventListener && removeEventListener) {
        addEventListener('unhandledrejection', rejectionTrackingListener);
        
        return () => {
          removeEventListener('unhandledrejection', rejectionTrackingListener);
        };
      }
    }
  }, []);
  
  // Initialize user profile caching and record app session start
  useEffect(() => {
    const initializeProfile = async () => {
      console.log('[App] Initializing user profile caching');
      
      try {
        // Record app session start in usage stats
        await recordSessionStart();
        
        // Clear expired cache items (older than 7 days)
        await clearExpiredCache();
        
        console.log('[App] User profile initialization completed');
      } catch (error) {
        console.error('[App] Error initializing user profile:', error);
      }
    };
    
    initializeProfile();
  }, []);

  // Set up notification handler
  useEffect(() => {
    if (navigationRef.current) {
      const unsubscribe = setupNotificationHandler(navigationRef.current);
      return unsubscribe;
    }
  }, [navigationRef.current]);

  // Show loading screen while checking auth state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    );
  }

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <UserProvider>
            <ResearchProvider>
              <Toaster />
              <NavigationContainer
                ref={navigationRef}
                onStateChange={(state) => {
                  // Handle navigation state changes if needed
                }}
              >
                <RootStack initialRouteName={initialRouteName} />
              </NavigationContainer>
            </ResearchProvider>
          </UserProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  }
});

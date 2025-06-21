import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Animated,
  SafeAreaView,
  Switch,
  TextInput,
  Alert
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { MotiView } from 'moti';
import { toast } from 'sonner-native';
import * as userStorage from '../utils/userStorage';
import { clearAllCache, clearCacheByType, getCacheStats } from '../utils/cacheManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../utils/storage';

export default function DevControlScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { isDarkMode, theme } = useTheme();
  const scrollY = useRef(new Animated.Value(0)).current;
  
  // Dev settings state
  const [debugMode, setDebugMode] = useState(false);
  const [verboseLogging, setVerboseLogging] = useState(false);
  const [mockDataMode, setMockDataMode] = useState(false);
  const [enableTestFeatures, setEnableTestFeatures] = useState(false);
  
  // Supabase configuration state
  const [isEditingSupabase, setIsEditingSupabase] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  const [supabaseServiceRole, setSupabaseServiceRole] = useState('');
  const [supabaseWebhookUrl, setSupabaseWebhookUrl] = useState('');

  // Cache stats state
  const [cacheStats, setCacheStats] = useState<any>(null);
  
  // Load cache stats on mount
  useEffect(() => {
    const loadCacheStats = async () => {
      const stats = await getCacheStats();
      console.log('[DevControlScreen] Loaded cache stats', stats);
      setCacheStats(stats);
    };
    
    loadCacheStats();
  }, []);
  
  // Animated header opacity for scroll effect
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  
  // Function to handle reset app data
  const handleResetAppData = () => {
    Alert.alert(
      'Reset App Data',
      'This will delete all app data and cannot be undone. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllCache();
              toast.success('App data reset successfully');
              // Refresh cache stats
              const stats = await getCacheStats();
              setCacheStats(stats);
            } catch (error) {
              console.error('[DevControlScreen] Error resetting app data:', error);
              toast.error('Failed to reset app data');
            }
          }
        }
      ]
    );
  };
  
  // Function to run database migrations
  const handleRunMigrations = () => {
    toast.info('Database migration functionality will be implemented in the future');
  };
  
  // Function to clear cache
  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear the app cache. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear',
          onPress: async () => {
            try {
              await clearAllCache();
              toast.success('Cache cleared successfully');
              // Refresh cache stats
              const stats = await getCacheStats();
              setCacheStats(stats);
            } catch (error) {
              console.error('[DevControlScreen] Error clearing cache:', error);
              toast.error('Failed to clear cache');
            }
          }
        }
      ]
    );
  };
  
  // Function to clear specific cache type
  const handleClearCacheType = (type: string) => {
    Alert.alert(
      `Clear ${type} Cache`,
      `This will clear the ${type.toLowerCase()} cache. Are you sure?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear',
          onPress: async () => {
            try {
              await clearCacheByType(type as any);
              toast.success(`${type} cache cleared successfully`);
              // Refresh cache stats
              const stats = await getCacheStats();
              setCacheStats(stats);
            } catch (error) {
              console.error(`[DevControlScreen] Error clearing ${type} cache:`, error);
              toast.error(`Failed to clear ${type} cache`);
            }
          }
        }
      ]
    );
  };
  
  // Function to save Supabase configuration
  const handleSaveSupabaseConfig = () => {
    // Add logic to save configuration to AsyncStorage or other storage method
    Alert.alert(
      'Save Configuration',
      'This will update the Supabase configuration. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Save',
          onPress: async () => {
            try {
              // Save the configuration values to AsyncStorage
              const config = {
                url: supabaseUrl,
                anonKey: supabaseAnonKey,
                serviceRole: supabaseServiceRole,
                webhookUrl: supabaseWebhookUrl,
                updatedAt: new Date().toISOString()
              };
              
              await AsyncStorage.setItem(`${KEYS.CONFIG}supabase`, JSON.stringify(config));
              console.log('[DevControlScreen] Saved Supabase configuration', config);
              
              toast.success('Supabase configuration saved');
              setIsEditingSupabase(false);
            } catch (error) {
              console.error('[DevControlScreen] Error saving Supabase config:', error);
              toast.error('Failed to save configuration');
            }
          }
        }
      ]
    );
  };
  
  // Load existing Supabase configuration
  useEffect(() => {
    const loadSupabaseConfig = async () => {
      try {
        const configJSON = await AsyncStorage.getItem(`${KEYS.CONFIG}supabase`);
        
        if (configJSON) {
          const config = JSON.parse(configJSON);
          console.log('[DevControlScreen] Loaded Supabase configuration');
          
          setSupabaseUrl(config.url || '');
          setSupabaseAnonKey(config.anonKey || '');
          setSupabaseServiceRole(config.serviceRole || '');
          setSupabaseWebhookUrl(config.webhookUrl || '');
        }
      } catch (error) {
        console.error('[DevControlScreen] Error loading Supabase config:', error);
      }
    };
    
    loadSupabaseConfig();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      
      {/* Header */}
      <Animated.View style={[
        styles.header,
        { 
          backgroundColor: theme.card,
          opacity: headerOpacity,
          shadowOpacity: headerOpacity,
          borderBottomColor: theme.border 
        }
      ]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Developer Controls</Text>
        <View style={styles.headerRight} />
      </Animated.View>
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Dev Banner */}
        <LinearGradient
          colors={['#7928CA', '#FF0080']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.devBanner}
        >
          <View style={styles.devTitleContainer}>
            <MaterialIcons name="developer-mode" size={32} color="#fff" />
            <Text style={styles.devTitle}>Developer Mode</Text>
          </View>
          <Text style={styles.devSubtitle}>
            Welcome to developer controls. This area is for backend enhancements and testing.
          </Text>
        </LinearGradient>
        
        {/* Supabase Configuration Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={[styles.configSection, { backgroundColor: theme.card }]}
        >
          <View style={styles.configHeader}>
            <View style={styles.configTitleContainer}>
              <MaterialIcons 
                name="settings" 
                size={24} 
                color={theme.accent} 
              />
              <Text style={[styles.sectionTitle, { color: theme.text, marginLeft: 8, marginBottom: 0 }]}>
                Supabase Configuration
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setIsEditingSupabase(!isEditingSupabase)}
            >
              <MaterialIcons 
                name={isEditingSupabase ? "check" : "edit"} 
                size={22} 
                color={theme.accent} 
              />
            </TouchableOpacity>
          </View>
          
          {isEditingSupabase ? (
            <View style={styles.configEditContainer}>
              <View style={styles.configInputGroup}>
                <Text style={[styles.configLabel, { color: theme.secondaryText }]}>
                  Supabase URL
                </Text>
                <TextInput
                  style={[styles.configInput, { 
                    backgroundColor: theme.inputBackground, 
                    color: theme.text,
                    borderColor: theme.border
                  }]}
                  placeholder="https://your-project.supabase.co"
                  placeholderTextColor={theme.secondaryText}
                  value={supabaseUrl}
                  onChangeText={setSupabaseUrl}
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.configInputGroup}>
                <Text style={[styles.configLabel, { color: theme.secondaryText }]}>
                  Supabase Anon Key
                </Text>
                <TextInput
                  style={[styles.configInput, { 
                    backgroundColor: theme.inputBackground, 
                    color: theme.text,
                    borderColor: theme.border
                  }]}
                  placeholder="eyJh..."
                  placeholderTextColor={theme.secondaryText}
                  value={supabaseAnonKey}
                  onChangeText={setSupabaseAnonKey}
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.configInputGroup}>
                <Text style={[styles.configLabel, { color: theme.secondaryText }]}>
                  Supabase Service Role Secret
                </Text>
                <TextInput
                  style={[styles.configInput, { 
                    backgroundColor: theme.inputBackground, 
                    color: theme.text,
                    borderColor: theme.border
                  }]}
                  placeholder="eyJh..."
                  placeholderTextColor={theme.secondaryText}
                  value={supabaseServiceRole}
                  onChangeText={setSupabaseServiceRole}
                  autoCapitalize="none"
                  secureTextEntry
                />
              </View>
              
              <View style={styles.configInputGroup}>
                <Text style={[styles.configLabel, { color: theme.secondaryText }]}>
                  Webhook URL
                </Text>
                <TextInput
                  style={[styles.configInput, { 
                    backgroundColor: theme.inputBackground, 
                    color: theme.text,
                    borderColor: theme.border
                  }]}
                  placeholder="https://your-webhook-url.com/endpoint"
                  placeholderTextColor={theme.secondaryText}
                  value={supabaseWebhookUrl}
                  onChangeText={setSupabaseWebhookUrl}
                  autoCapitalize="none"
                />
              </View>
              
              <TouchableOpacity
                style={[styles.saveConfigButton, { backgroundColor: theme.accent }]}
                onPress={handleSaveSupabaseConfig}
              >
                <Text style={styles.saveConfigButtonText}>Save Configuration</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.configViewContainer}>
              <View style={styles.configRow}>
                <Text style={[styles.configLabel, { color: theme.secondaryText }]}>
                  Supabase URL:
                </Text>
                <Text style={[styles.configValue, { color: theme.text }]}>
                  {supabaseUrl || 'Not configured'}
                </Text>
              </View>
              
              <View style={styles.configRow}>
                <Text style={[styles.configLabel, { color: theme.secondaryText }]}>
                  Anon Key:
                </Text>
                <Text style={[styles.configValue, { color: theme.text }]}>
                  {supabaseAnonKey ? '••••••••••••••••' : 'Not configured'}
                </Text>
              </View>
              
              <View style={styles.configRow}>
                <Text style={[styles.configLabel, { color: theme.secondaryText }]}>
                  Service Role:
                </Text>
                <Text style={[styles.configValue, { color: theme.text }]}>
                  {supabaseServiceRole ? '••••••••••••••••' : 'Not configured'}
                </Text>
              </View>
              
              <View style={styles.configRow}>
                <Text style={[styles.configLabel, { color: theme.secondaryText }]}>
                  Webhook URL:
                </Text>
                <Text style={[styles.configValue, { color: theme.text }]}>
                  {supabaseWebhookUrl || 'Not configured'}
                </Text>
              </View>
            </View>
          )}
        </MotiView>
        
        {/* Settings Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={[styles.settingsSection, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Debug Settings</Text>
          
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <MaterialIcons 
                name="bug-report" 
                size={22} 
                color={theme.accent} 
              />
              <Text style={[styles.settingText, { color: theme.text }]}>Debug Mode</Text>
            </View>
            <Switch
              value={debugMode}
              onValueChange={setDebugMode}
              trackColor={{ false: '#DEE2E6', true: theme.accent }}
              thumbColor={'#FFFFFF'}
            />
          </View>
          
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <MaterialIcons 
                name="list-alt" 
                size={22} 
                color={theme.accent} 
              />
              <Text style={[styles.settingText, { color: theme.text }]}>Verbose Logging</Text>
            </View>
            <Switch
              value={verboseLogging}
              onValueChange={setVerboseLogging}
              trackColor={{ false: '#DEE2E6', true: theme.accent }}
              thumbColor={'#FFFFFF'}
            />
          </View>
          
          <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <MaterialIcons 
                name="data-usage" 
                size={22} 
                color={theme.accent} 
              />
              <Text style={[styles.settingText, { color: theme.text }]}>Use Mock Data</Text>
            </View>
            <Switch
              value={mockDataMode}
              onValueChange={setMockDataMode}
              trackColor={{ false: '#DEE2E6', true: theme.accent }}
              thumbColor={'#FFFFFF'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <MaterialIcons 
                name="science" 
                size={22} 
                color={theme.accent} 
              />
              <Text style={[styles.settingText, { color: theme.text }]}>Enable Test Features</Text>
            </View>
            <Switch
              value={enableTestFeatures}
              onValueChange={setEnableTestFeatures}
              trackColor={{ false: '#DEE2E6', true: theme.accent }}
              thumbColor={'#FFFFFF'}
            />
          </View>
        </MotiView>
        
        {/* Actions Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={[styles.actionsSection, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Maintenance Actions</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: 'rgba(108, 99, 255, 0.1)' }]}
            onPress={handleClearCache}
          >
            <Feather name="refresh-cw" size={20} color="#6c63ff" />
            <Text style={styles.actionButtonText}>Clear App Cache</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: 'rgba(46, 204, 113, 0.1)', marginTop: 12 }]}
            onPress={handleRunMigrations}
          >
            <Feather name="database" size={20} color="#2ecc71" />
            <Text style={[styles.actionButtonText, { color: '#2ecc71' }]}>Run Database Migrations</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: 'rgba(231, 76, 60, 0.1)', marginTop: 12 }]}
            onPress={handleResetAppData}
          >
            <Feather name="trash-2" size={20} color="#e74c3c" />
            <Text style={[styles.actionButtonText, { color: '#e74c3c' }]}>Reset App Data</Text>
          </TouchableOpacity>
        </MotiView>
        
        {/* Cache Management Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={[styles.cacheSection, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Cache Management</Text>
          
          {/* Cache Statistics */}
          <View style={[styles.cacheStatsContainer, { backgroundColor: theme.inputBackground }]}>
            <Text style={[styles.cacheStatsTitle, { color: theme.text }]}>Cache Statistics</Text>
            
            {cacheStats ? (
              <>
                <View style={styles.cacheStat}>
                  <Text style={[styles.cacheStatLabel, { color: theme.secondaryText }]}>Total Items:</Text>
                  <Text style={[styles.cacheStatValue, { color: theme.text }]}>{cacheStats.totalItems}</Text>
                </View>
                
                <View style={styles.cacheStat}>
                  <Text style={[styles.cacheStatLabel, { color: theme.secondaryText }]}>Total Size:</Text>
                  <Text style={[styles.cacheStatValue, { color: theme.text }]}>
                    {(cacheStats.totalSize / 1024).toFixed(2)} KB
                  </Text>
                </View>
                
                {Object.entries(cacheStats.itemsByType).map(([type, count]) => (
                  <View key={type} style={styles.cacheStat}>
                    <Text style={[styles.cacheStatLabel, { color: theme.secondaryText }]}>{type}:</Text>
                    <Text style={[styles.cacheStatValue, { color: theme.text }]}>{count as number} items</Text>
                  </View>
                ))}
              </>
            ) : (
              <Text style={[styles.cacheStatEmpty, { color: theme.secondaryText }]}>
                Loading cache statistics...
              </Text>
            )}
          </View>
          
          {/* Cache Actions */}
          <View style={styles.cacheActions}>
            <TouchableOpacity 
              style={[styles.cacheActionButton, { backgroundColor: 'rgba(108, 99, 255, 0.1)' }]}
              onPress={() => handleClearCacheType('AUTH')}
            >
              <Text style={styles.cacheActionText}>Clear Auth Cache</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.cacheActionButton, { backgroundColor: 'rgba(108, 99, 255, 0.1)' }]}
              onPress={() => handleClearCacheType('PREFERENCES')}
            >
              <Text style={styles.cacheActionText}>Clear Preferences</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.cacheActionButton, { backgroundColor: 'rgba(108, 99, 255, 0.1)' }]}
              onPress={() => handleClearCacheType('RESEARCH')}
            >
              <Text style={styles.cacheActionText}>Clear Research Cache</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.cacheActionButton, { backgroundColor: 'rgba(108, 99, 255, 0.1)' }]}
              onPress={() => handleClearCacheType('RESULTS')}
            >
              <Text style={styles.cacheActionText}>Clear Results Cache</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.refreshStatsButton, { backgroundColor: theme.inputBackground }]}
            onPress={async () => {
              const stats = await getCacheStats();
              setCacheStats(stats);
              toast.success('Cache statistics refreshed');
            }}
          >
            <Feather name="refresh-cw" size={16} color={theme.accent} />
            <Text style={[styles.refreshStatsText, { color: theme.accent }]}>Refresh Statistics</Text>
          </TouchableOpacity>
        </MotiView>
        
        {/* User Profile Data Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={[styles.profileDataSection, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>User Profile Data</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: 'rgba(108, 99, 255, 0.1)' }]}
            onPress={async () => {
              try {
                // Get all user data
                const authTokens = await userStorage.getAuthTokens();
                const preferences = await userStorage.getUserPreferences();
                const usageStats = await userStorage.getUsageStats();
                
                const userData = {
                  authTokens,
                  preferences,
                  usageStats
                };
                
                console.log('[DevControlScreen] User data:', userData);
                
                // Display alert with summary
                Alert.alert(
                  'User Profile Data',
                  `Auth Tokens: ${userData.authTokens ? 'Present' : 'None'}\nPreferences: ${userData.preferences ? 'Present' : 'None'}\nUsage Stats: ${userData.usageStats ? 'Present' : 'None'}`,
                  [
                    { text: 'OK' }
                  ]
                );
                
                // Show success toast with details
                toast.success('User profile data logged to console');
              } catch (error) {
                console.error('[DevControlScreen] Error fetching user data:', error);
                toast.error('Failed to fetch user data');
              }
            }}
          >
            <Feather name="user" size={20} color="#6c63ff" />
            <Text style={styles.actionButtonText}>View User Profile Data</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: 'rgba(108, 99, 255, 0.1)', marginTop: 12 }]}
            onPress={async () => {
              try {
                // Record session start by incrementing session count
                const current = await userStorage.getUsageStats() || {};
                const sessionCount = (current.sessionCount || 0) + 1;
                
                await userStorage.storeUsageStats({
                  ...current,
                  sessionCount,
                  lastSessionDate: new Date().toISOString()
                });
                
                toast.success('New session recorded');
              } catch (error) {
                console.error('[DevControlScreen] Error recording session:', error);
                toast.error('Failed to record session');
              }
            }}
          >
            <Feather name="clock" size={20} color="#6c63ff" />
            <Text style={styles.actionButtonText}>Record New Session</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: 'rgba(108, 99, 255, 0.1)', marginTop: 12 }]}
            onPress={async () => {
              try {
                // Record research completion by incrementing completion count
                const current = await userStorage.getUsageStats() || {};
                const completedResearchCount = (current.completedResearchCount || 0) + 1;
                const durationMs = 120000; // 2 minutes
                
                // Update average research time
                let averageResearchTime = current.averageResearchTime || 0;
                if (durationMs > 0) {
                  const totalTime = averageResearchTime * (completedResearchCount - 1) + durationMs;
                  averageResearchTime = totalTime / completedResearchCount;
                }
                
                await userStorage.storeUsageStats({
                  ...current,
                  completedResearchCount,
                  averageResearchTime,
                  updatedAt: new Date().toISOString()
                });
                
                toast.success('Research completion recorded');
              } catch (error) {
                console.error('[DevControlScreen] Error recording completion:', error);
                toast.error('Failed to record completion');
              }
            }}
          >
            <Feather name="check-circle" size={20} color="#6c63ff" />
            <Text style={styles.actionButtonText}>Record Research Completion</Text>
          </TouchableOpacity>
        </MotiView>
        
        {/* Test Screens Section */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          style={[styles.testScreensSection, { backgroundColor: theme.card }]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Test Screens</Text>
          
          <TouchableOpacity 
            style={[styles.testScreenButton, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('TestN8nWebhook' as never)}
          >
            <MaterialIcons name="webhook" size={22} color={theme.accent} />
            <Text style={[styles.testScreenText, { color: theme.text }]}>N8n Webhook Test</Text>
            <MaterialIcons name="chevron-right" size={22} color={theme.secondaryText} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testScreenButton, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('TestProgressScreen' as never)}
          >
            <MaterialIcons name="access-time" size={22} color={theme.accent} />
            <Text style={[styles.testScreenText, { color: theme.text }]}>Research Progress Test</Text>
            <MaterialIcons name="chevron-right" size={22} color={theme.secondaryText} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testScreenButton, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('TestResearchResultScreen' as never)}
          >
            <MaterialIcons name="description" size={22} color={theme.accent} />
            <Text style={[styles.testScreenText, { color: theme.text }]}>Research Result Test</Text>
            <MaterialIcons name="chevron-right" size={22} color={theme.secondaryText} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testScreenButton, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('TestActiveQueueScreen' as never)}
          >
            <MaterialIcons name="queue" size={22} color={theme.accent} />
            <Text style={[styles.testScreenText, { color: theme.text }]}>Active Queue Test</Text>
            <MaterialIcons name="chevron-right" size={22} color={theme.secondaryText} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.testScreenButton, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('SimpleQueueTest' as never)}
          >
            <MaterialIcons name="playlist-play" size={22} color={theme.accent} />
            <Text style={[styles.testScreenText, { color: theme.text }]}>Simple Queue Test</Text>
            <MaterialIcons name="chevron-right" size={22} color={theme.secondaryText} />
          </TouchableOpacity>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  backButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  devBanner: {
    padding: 20,
    borderRadius: 12,
    margin: 16,
    marginTop: 80,
  },
  devTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  devTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 12,
  },
  devSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginLeft: 4,
  },
  settingsSection: {
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
  },
  configSection: {
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
  },
  actionsSection: {
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
  },
  testScreensSection: {
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
    marginBottom: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6c63ff',
    marginLeft: 8,
  },
  testScreenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  testScreenText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  configTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    padding: 8,
  },
  configEditContainer: {
    marginTop: 8,
  },
  configValue: {
    flex: 1,
    fontSize: 14,
    textAlign: 'right',
  },
  configViewContainer: {
    marginTop: 8,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  configLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  configInputGroup: {
    marginBottom: 16,
  },
  configInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginTop: 4,
  },
  saveConfigButton: {
    backgroundColor: '#6c63ff',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveConfigButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Cache Management Styles
  cacheSection: {
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
  },
  cacheStatsContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  cacheStatsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  cacheStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  cacheStatLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  cacheStatValue: {
    fontSize: 14,
  },
  cacheStatEmpty: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  cacheActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cacheActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    width: '48%',
    alignItems: 'center',
  },
  cacheActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c63ff',
  },
  refreshStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  refreshStatsText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  // Profile Data Section Styles
  profileDataSection: {
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginTop: 8,
  },
}); 
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Types for our environment variables
interface EnvVariables {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  N8N_WEBHOOK_URL: string;
}

// Function to get environment variables from different sources
function getEnvironmentVariable(name: keyof EnvVariables): string | undefined {
  // Try to get from Expo Constants first (app.config.js or app.json extra)
  const expoConstant = Constants.expoConfig?.extra?.[name];
  if (expoConstant) {
    console.log(`[CONFIG] Found ${name} in Expo Constants`);
    return expoConstant as string;
  }

  // Try to get from process.env (for Expo dev client and bare workflow)
  if (process.env[`EXPO_PUBLIC_${name}`]) {
    console.log(`[CONFIG] Found ${name} in process.env with EXPO_PUBLIC_ prefix`);
    return process.env[`EXPO_PUBLIC_${name}`] as string;
  }

  // Try to get from imported @env (for backward compatibility)
  try {
    // Only attempt to import if we need to
    const envModule = require('@env');
    if (envModule && envModule[name]) {
      console.log(`[CONFIG] Found ${name} in @env module`);
      return envModule[name];
    }
  } catch (error) {
    // Silently fail if @env is not available or doesn't contain the variable
  }

  console.log(`[CONFIG] Could not find ${name} in any environment source`);
  // Return undefined if not found
  return undefined;
}

// Create config object with getters to ensure fresh values and prevent mutations
const config = {
  get SUPABASE_URL(): string {
    const url = getEnvironmentVariable('SUPABASE_URL');
    if (!url) {
      console.error('SUPABASE_URL environment variable is missing. Authentication and data functionality will not work.');
      return ''; // Return empty string to prevent undefined errors
    }
    return url;
  },
  
  get SUPABASE_ANON_KEY(): string {
    const key = getEnvironmentVariable('SUPABASE_ANON_KEY');
    if (!key) {
      console.error('SUPABASE_ANON_KEY environment variable is missing. Authentication and data functionality will not work.');
      return ''; // Return empty string to prevent undefined errors
    }
    return key;
  },
  
  get N8N_WEBHOOK_URL(): string {
    const url = getEnvironmentVariable('N8N_WEBHOOK_URL');
    if (!url) {
      console.error('N8N_WEBHOOK_URL environment variable is missing. Research submission functionality will not work.');
      return ''; // Return empty string to prevent undefined errors
    }
    return url;
  },

  // Helper method to check if all required variables are set
  isConfigValid(): boolean {
    const isSupabaseConfigValid = Boolean(this.SUPABASE_URL && this.SUPABASE_ANON_KEY);
    const isWebhookConfigValid = Boolean(this.N8N_WEBHOOK_URL);
    
    if (!isSupabaseConfigValid) {
      console.error('Supabase configuration is incomplete. Please check SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
    }
    
    if (!isWebhookConfigValid) {
      console.error('Webhook configuration is missing. Research submission will not work.');
    }
    
    return isSupabaseConfigValid;
  },

  // Debug method to log config status (without revealing sensitive values)
  logConfigStatus(): void {
    console.log('Environment Configuration Status:');
    console.log(`- SUPABASE_URL: ${this.SUPABASE_URL ? '✓ Set' : '✗ Missing'}`);
    console.log(`- SUPABASE_ANON_KEY: ${this.SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing'}`);
    console.log(`- N8N_WEBHOOK_URL: ${this.N8N_WEBHOOK_URL ? '✓ Set' : '✕ Not set (optional)'}`);
    console.log(`- Platform: ${Platform.OS}`);
    console.log(`- Dev Mode: ${__DEV__ ? 'Yes' : 'No'}`);
    
    // Check if extra exists in Constants
    console.log('\nExpo Constants Structure:');
    console.log(`- Constants.expoConfig: ${Constants.expoConfig ? '✓ Exists' : '✗ Missing'}`);
    console.log(`- Constants.expoConfig.extra: ${Constants.expoConfig?.extra ? '✓ Exists' : '✗ Missing'}`);
    
    // Log all available keys in extra (if it exists)
    if (Constants.expoConfig?.extra) {
      console.log('\nAvailable keys in Constants.expoConfig.extra:');
      Object.keys(Constants.expoConfig.extra).forEach(key => {
        console.log(`- ${key}: ${Constants.expoConfig?.extra?.[key] ? '✓ Has value' : '✗ No value'}`);
      });
    }
  }
};

export default config; 
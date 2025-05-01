/**
 * Debug utility for environment variables
 * Run with: node backend/services/debugEnv.js
 */

const path = require('path');
const fs = require('fs');

// Check for .env file
function checkEnvFiles() {
  console.log('Checking for environment files...');
  
  const envFiles = [
    '.env.development.local',
    '.env.local',
    '.env.development',
    '.env'
  ];
  
  envFiles.forEach(file => {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
      console.log(`✅ ${file} exists`);
      
      // Check content (safely)
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      console.log(`   File has ${lines.length} lines`);
      lines.forEach(line => {
        // Skip comments and empty lines
        if (line.trim() === '' || line.trim().startsWith('#')) return;
        
        // Check for key=value format
        if (line.includes('=')) {
          const key = line.split('=')[0].trim();
          console.log(`   - Contains key: ${key}`);
        }
      });
    } else {
      console.log(`❌ ${file} does not exist`);
    }
  });
}

// Try to load .env.local file directly
function loadEnvLocal() {
  console.log('\nTrying to load .env.local directly...');
  
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
      if (!line || line.startsWith('#')) return;
      
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        const value = line.substring(equalIndex + 1).trim();
        
        // Store but don't show full values for sensitive data
        if (key.includes('KEY') || key.includes('SECRET')) {
          env[key] = value;
          console.log(`   ${key}: [HIDDEN FOR SECURITY]`);
        } else {
          env[key] = value;
          console.log(`   ${key}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
        }
      }
    });
    
    return env;
  } else {
    console.log('   .env.local file not found');
    return {};
  }
}

// Run the checks
console.log('===== ENVIRONMENT VARIABLES DEBUG =====');
console.log('Current directory:', process.cwd());
checkEnvFiles();
const envValues = loadEnvLocal();

console.log('\n===== ENVIRONMENT VARIABLES STATUS =====');
console.log('SUPABASE_URL:', envValues.SUPABASE_URL ? '✅ Found' : '❌ Missing');
console.log('SUPABASE_ANON_KEY:', envValues.SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing');
console.log('N8N_WEBHOOK_URL:', envValues.N8N_WEBHOOK_URL ? '✅ Found' : '❌ Missing');

console.log('\n===== SYSTEM ENVIRONMENT VARIABLES =====');
console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? '✅ Found' : '❌ Missing');
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✅ Found' : '❌ Missing');
console.log('EXPO_PUBLIC_N8N_WEBHOOK_URL:', process.env.EXPO_PUBLIC_N8N_WEBHOOK_URL ? '✅ Found' : '❌ Missing');

console.log('\n===== DEBUG COMPLETE =====');
console.log('If environment variables are missing, try:');
console.log('1. Ensure .env.local contains the correct variables');
console.log('2. Try setting them as system environment variables with EXPO_PUBLIC_ prefix');
console.log('3. Restart your development server with: npx expo start --clear'); 
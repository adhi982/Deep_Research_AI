const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Clearing Expo and Metro caches...');

try {
  // Clean .expo cache directory
  const expoDir = path.resolve(__dirname, '..', '.expo');
  if (fs.existsSync(expoDir)) {
    console.log('Removing .expo cache directory...');
    fs.rmSync(expoDir, { recursive: true, force: true });
  }

  // Clear Metro cache
  console.log('Clearing Metro cache...');
  execSync('npx react-native start --reset-cache', { 
    stdio: 'inherit',
    cwd: path.resolve(__dirname, '..')
  });

  // Clear watchman watches if available
  try {
    console.log('Clearing Watchman watches...');
    execSync('watchman watch-del-all', { stdio: 'inherit' });
  } catch (e) {
    console.log('Watchman not available, skipping...');
  }

  console.log('✅ Successfully cleared all caches!');
  console.log('➡️ You can now run the app with: npx expo start --clear');
} catch (error) {
  console.error('❌ Error clearing caches:', error);
  process.exit(1);
} 
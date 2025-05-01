// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  resolver: {
    sourceExts: [...defaultConfig.resolver.sourceExts, 'mjs', 'cjs'],
    assetExts: [...defaultConfig.resolver.assetExts]
  },
  transformer: {
    ...defaultConfig.transformer,
    minifierConfig: {
      compress: {
        drop_console: false, // Keep console logs for debugging
      }
    }
  },
  server: {
    ...defaultConfig.server,
  },
  // Reduce workers for better stability
  maxWorkers: 2
}; 
module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Support for environment variables
      ["module:react-native-dotenv", {
        "moduleName": "@env",
        "path": ".env.local",
        "blacklist": null,
        "whitelist": null,
        "safe": false,
        "allowUndefined": true
      }],
      
      // For improved module resolution
      ['module-resolver', {
        root: ['./'],
        extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        alias: {
          '@components': './components',
          '@screens': './screens',
          '@utils': './utils',
          '@context': './context',
          '@assets': './assets',
        }
      }]
    ]
  };
};
const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: [
          '@gorhom/bottom-sheet',
          '@stream-io/flat-list-mvcp',
          'expo-image',
        ],
      },
    },
    argv
  );

  // Add polyfills for web
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
    'react-native-web': path.resolve(__dirname, 'node_modules/react-native-web'),
  };

  // Ensure we use the web entry point
  config.resolve.extensions = [
    '.web.ts',
    '.web.tsx',
    '.web.js',
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.json',
  ];

  // Add a special loader for String.S
  config.module.rules.push({
    test: /react-dom\/.*\/react-dom-client\.development\.js$/,
    use: [
      {
        loader: 'string-replace-loader',
        options: {
          search: 'String.S',
          replace: '(String.S || "")',
          flags: 'g',
        },
      },
    ],
  });

  return config;
}; 
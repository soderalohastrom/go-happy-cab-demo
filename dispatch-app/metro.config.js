const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve files from parent directory (for shared convex/ folder)
config.watchFolders = [
  path.resolve(__dirname, '..'), // Parent directory (go-happy-cab-demo)
];

// Configure resolver to look in parent directory
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../node_modules'),
];

module.exports = config;


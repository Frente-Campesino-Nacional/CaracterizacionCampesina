const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');

const config = getDefaultConfig(__dirname);

// OneDrive can temporarily lock files under root node_modules, causing Metro EBUSY.
config.resolver.blockList = exclusionList([
  /.*\/node_modules\/fork-ts-checker-webpack-plugin\/.*/,
  /.*node_modules.*_tmp_.*/,
]);

module.exports = config;

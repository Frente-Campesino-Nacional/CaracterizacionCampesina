const { getDefaultConfig } = require('expo/metro-config');
const exclusionList = require('metro-config/src/defaults/exclusionList');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

// Ensure Metro watches all monorepo packages and apps
config.watchFolders = [
  path.resolve(projectRoot, 'apps/mobile'),
  path.resolve(projectRoot, 'packages'),
];

config.resolver.blockList = exclusionList([
  /.*\/node_modules\/fork-ts-checker-webpack-plugin\/.*/,
  /.*node_modules.*_tmp_.*/,
]);

module.exports = config;

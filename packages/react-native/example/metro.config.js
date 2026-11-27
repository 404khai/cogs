// Runs the example against the package source (../src) and the studio's shared logic (../../../app/src/lib),
// so edits there hot-reload here. React and friends always come from this example's node_modules.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const root = path.resolve(__dirname, '../../..');
const config = getDefaultConfig(__dirname);

config.watchFolders = [path.resolve(__dirname, '..'), path.join(root, 'app/src/lib')];
config.resolver.nodeModulesPaths = [path.join(__dirname, 'node_modules')];
config.resolver.disableHierarchicalLookup = true;
config.resolver.blockList = [/packages\/react-native\/node_modules\/.*/, /app\/node_modules\/.*/];
const resolve = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, name, platform) =>
  name === '@404khai/cogs-react-native'
    ? { type: 'sourceFile', filePath: path.resolve(__dirname, '../src/index.ts') }
    : (resolve ?? context.resolveRequest)(context, name, platform);

module.exports = config;

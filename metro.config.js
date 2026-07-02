const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro 的 package "exports" 解析在 Hermes 打包下会给 use-latest-callback 选错入口，
// 导致 React Navigation 运行时报 "useLatestCallback.default is not a function" → 白屏。
// 关闭后回退到 main 字段解析，CJS/ESM 互操作正常。
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
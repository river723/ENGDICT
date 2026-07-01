// Expo Webpack 配置覆盖：强制相对路径，以便 Electron 通过 file:// 加载 web-build 产物
const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  // 让 JS/CSS/资源引用使用相对路径，避免 Electron file:// 下绝对路径加载失败
  config.output.publicPath = './';
  return config;
};

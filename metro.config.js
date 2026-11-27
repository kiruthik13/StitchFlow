const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Defer JS module evaluation until first import to reduce cold-start time & RAM on 4 GB devices
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

module.exports = config;

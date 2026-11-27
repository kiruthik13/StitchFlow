const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo Config Plugin for StitchFlow Extended Native Barcode Decoding (Android)
 *
 * Adds ZXing-Cpp / CameraX ImageAnalysis dependency configuration when prebuilding
 * with EAS Build so Micro QR, GS1 DataBar, and MicroPDF417 can be decoded natively
 * alongside Expo Camera's Google ML Kit pipeline.
 */
module.exports = function withStitchFlowBarcodeDecoder(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('com.google.zxing:core')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    // StitchFlow extended barcode symbology support (Micro QR, DataBar, MicroPDF417)\n    implementation("com.google.zxing:core:3.5.3")`,
      );
    }
    return cfg;
  });
};

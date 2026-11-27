const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withDangerousMod, withMainApplication } = require('@expo/config-plugins');

/**
 * Expo Config Plugin for StitchFlow Extended Native Barcode Decoding (Android)
 *
 * 1. Adds ZXing-C++ Android (`io.github.zxing-cpp:android:2.2.0`, Apache-2.0) for Micro QR & GS1 DataBar.
 * 2. Copies StitchFlowBarcodeModule.kt & StitchFlowBarcodePackage.kt into the Android project.
 * 3. Registers StitchFlowBarcodePackage in MainApplication.kt.
 *
 * Note: MicroPDF417 is NOT supported by ZXing-C++ or Google ML Kit.
 */
module.exports = function withStitchFlowBarcodeDecoder(config) {
  config = withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes('io.github.zxing-cpp:android')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /dependencies\s*\{/,
        `dependencies {\n    // StitchFlow extended barcode symbology support (Micro QR, GS1 DataBar)\n    implementation("io.github.zxing-cpp:android:2.2.0")`,
      );
    }
    return cfg;
  });

  config = withMainApplication(config, (cfg) => {
    if (!cfg.modResults.contents.includes('StitchFlowBarcodePackage')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        'packages.apply {',
        'packages.apply {\n              add(StitchFlowBarcodePackage())',
      );
    }
    return cfg;
  });

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const targetDir = path.join(
        cfg.modRequest.platformProjectRoot,
        'app/src/main/java/com/stitchflow/app',
      );
      fs.mkdirSync(targetDir, { recursive: true });
      const srcDir = path.join(cfg.modRequest.projectRoot, 'android-native');
      for (const file of ['StitchFlowBarcodeModule.kt', 'StitchFlowBarcodePackage.kt']) {
        fs.copyFileSync(path.join(srcDir, file), path.join(targetDir, file));
      }
      return cfg;
    },
  ]);

  return config;
};

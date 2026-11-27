import { NativeModules, Platform } from 'react-native';
import {
  decodeSpecializedFromGrayscale,
  rgbaToGrayscale,
  SpecializedDecodeResult,
} from './specialized1dDecoder';

export interface NativeZxingResult {
  decoded: boolean;
  text?: string;
  format?: string;
  decoder?: string;
  reason?: string;
}

interface StitchFlowBarcodeNativeModule {
  decodeImageFile(uri: string): Promise<NativeZxingResult>;
}

const NativeBarcode: StitchFlowBarcodeNativeModule | undefined =
  Platform.OS === 'android'
    ? (NativeModules.StitchFlowBarcode as StitchFlowBarcodeNativeModule | undefined)
    : undefined;

export interface CameraFrameDecodeOutcome {
  decoded: boolean;
  rawText?: string;
  symbology?: string;
  decoder?: 'zxing-cpp' | 'stitchflow-1d-cv';
  checksumValid?: boolean;
  reason?: string;
}

/**
 * Tier 2 -> Tier 3 fallback pipeline for a captured CameraView frame URI.
 * 1. Invokes native ZXing-C++ (`StitchFlowBarcode.decodeImageFile`) when built with EAS/prebuild.
 * 2. Falls back to Tier 3 specialized 1D CV decoder when an optional grayscale/RGBA buffer is available.
 */
export async function decodeCapturedCameraFrame(
  imageUri: string,
  options?: {
    allowPharmacode?: boolean;
    rgbaBuffer?: { data: Uint8Array; width: number; height: number };
  },
): Promise<CameraFrameDecodeOutcome> {
  if (NativeBarcode?.decodeImageFile) {
    try {
      const nativeRes = await NativeBarcode.decodeImageFile(imageUri);
      if (nativeRes.decoded && nativeRes.text) {
        return {
          decoded: true,
          rawText: nativeRes.text,
          symbology: nativeRes.format ?? 'ZXING_EXTENDED',
          decoder: 'zxing-cpp',
        };
      }
    } catch (err) {
      // Continue to Tier 3 fallback if available
    }
  }

  if (options?.rgbaBuffer) {
    const { data, width, height } = options.rgbaBuffer;
    const gray = rgbaToGrayscale(data, width, height);
    const res: SpecializedDecodeResult = decodeSpecializedFromGrayscale(gray, width, height, {
      allowPharmacode: options.allowPharmacode,
    });
    if (res.decoded && res.value) {
      return {
        decoded: true,
        rawText: res.value,
        symbology: res.symbology,
        decoder: 'stitchflow-1d-cv',
        checksumValid: res.checksumValid,
      };
    }
    return { decoded: false, reason: res.reason };
  }

  return {
    decoded: false,
    reason: NativeBarcode
      ? 'No extended or specialized barcode detected in frame'
      : 'Extended native decoder requires EAS Android build (preview-arm64)',
  };
}

import { NativeModules, Platform } from 'react-native';
import {
  decodePharmacode2TrackFromGrayscale,
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
  roiGrayscaleBase64?: string;
  roiWidth?: number;
  roiHeight?: number;
}

interface StitchFlowBarcodeNativeModule {
  decodeImageFile(uri: string): Promise<NativeZxingResult>;
  decodeOrExtractRoi(uri: string, includeRoi: boolean): Promise<NativeZxingResult>;
}

const NativeBarcode: StitchFlowBarcodeNativeModule | undefined =
  Platform.OS === 'android'
    ? (NativeModules.StitchFlowBarcode as StitchFlowBarcodeNativeModule | undefined)
    : undefined;

function base64ToUint8Array(b64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let p = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const a = chars.indexOf(clean[i]);
    const b = chars.indexOf(clean[i + 1]);
    const c = i + 2 < clean.length ? chars.indexOf(clean[i + 2]) : 0;
    const d = i + 3 < clean.length ? chars.indexOf(clean[i + 3]) : 0;
    const n = (a << 18) | (b << 12) | (c << 6) | d;
    out[p++] = (n >> 16) & 0xff;
    if (i + 2 < clean.length && p < out.length) out[p++] = (n >> 8) & 0xff;
    if (i + 3 < clean.length && p < out.length) out[p++] = n & 0xff;
  }
  return out;
}

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
 * 1. Invokes native ZXing-C++ (`StitchFlowBarcode.decodeOrExtractRoi`) with EXIF rotation & bounded ROI.
 * 2. Falls back to Tier 3 specialized 1D/2T CV decoder using the native grayscale ROI buffer.
 */
export async function decodeCapturedCameraFrame(
  imageUri: string,
  options?: {
    allowPharmacode?: boolean;
    rgbaBuffer?: { data: Uint8Array; width: number; height: number };
  },
): Promise<CameraFrameDecodeOutcome> {
  let nativeRoi: { gray: Uint8Array; width: number; height: number } | undefined;

  if (NativeBarcode?.decodeOrExtractRoi || NativeBarcode?.decodeImageFile) {
    try {
      const nativeRes = NativeBarcode.decodeOrExtractRoi
        ? await NativeBarcode.decodeOrExtractRoi(imageUri, true)
        : await NativeBarcode.decodeImageFile(imageUri);
      if (nativeRes.decoded && nativeRes.text) {
        return {
          decoded: true,
          rawText: nativeRes.text,
          symbology: nativeRes.format ?? 'ZXING_EXTENDED',
          decoder: 'zxing-cpp',
        };
      }
      if (nativeRes.roiGrayscaleBase64 && nativeRes.roiWidth && nativeRes.roiHeight) {
        nativeRoi = {
          gray: base64ToUint8Array(nativeRes.roiGrayscaleBase64),
          width: nativeRes.roiWidth,
          height: nativeRes.roiHeight,
        };
      }
    } catch {
      // Continue to Tier 3 fallback if available
    }
  }

  const graySource = nativeRoi
    ? nativeRoi
    : options?.rgbaBuffer
      ? {
        gray: rgbaToGrayscale(options.rgbaBuffer.data, options.rgbaBuffer.width, options.rgbaBuffer.height),
        width: options.rgbaBuffer.width,
        height: options.rgbaBuffer.height,
      }
      : undefined;

  if (graySource) {
    const res: SpecializedDecodeResult = decodeSpecializedFromGrayscale(
      graySource.gray,
      graySource.width,
      graySource.height,
      { allowPharmacode: options?.allowPharmacode },
    );
    if (res.decoded && res.value) {
      return {
        decoded: true,
        rawText: res.value,
        symbology: res.symbology,
        decoder: 'stitchflow-1d-cv',
        checksumValid: res.checksumValid,
      };
    }
    if (options?.allowPharmacode) {
      const p2t = decodePharmacode2TrackFromGrayscale(graySource.gray, graySource.width, graySource.height);
      if (p2t?.decoded && p2t.value) {
        return {
          decoded: true,
          rawText: p2t.value,
          symbology: p2t.symbology,
          decoder: 'stitchflow-1d-cv',
        };
      }
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

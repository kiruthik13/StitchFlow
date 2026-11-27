import {
  ProcessedBarcode,
  ScannerInputSource,
  processBarcodePayload,
} from '../barcode/barcodeProcessor';

/**
 * HID Keyboard-Wedge Scanner Adapter Interface
 *
 * Supports physical USB OTG, Bluetooth HID, and industrial Android handheld scanners
 * operating in Human Interface Device (HID) keyboard emulation mode.
 */
export interface BarcodeValidationResult {
  valid: boolean;
  normalized: string;
  reason?: string;
  processed?: ProcessedBarcode;
}

export function validateBarcodeFormat(
  raw: string,
  options?: { expoType?: string; inputSource?: ScannerInputSource },
): BarcodeValidationResult {
  const processed = processBarcodePayload(raw, options);
  return {
    valid: processed.valid,
    normalized: processed.normalizedValue,
    reason: processed.reason,
    processed,
  };
}

export interface IHIDScannerAdapter {
  isHardwareConnected: boolean;
  lastScanAt: number | null;
  onBarcodeScanned: (callback: (barcode: string, processed?: ProcessedBarcode) => void) => () => void;
  emitScan: (barcode: string, source?: ScannerInputSource) => boolean;
  sendSimulatedScan: (barcode: string) => void;
}

export class HIDKeyboardWedgeAdapter implements IHIDScannerAdapter {
  public isHardwareConnected = false;
  public lastScanAt: number | null = null;
  private lastBarcode = '';
  private listeners: ((barcode: string, processed?: ProcessedBarcode) => void)[] = [];
  private readonly cooldownMs = 1200;

  onBarcodeScanned(callback: (barcode: string, processed?: ProcessedBarcode) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  emitScan(barcode: string, source: ScannerInputSource = 'hid'): boolean {
    const check = validateBarcodeFormat(barcode, { inputSource: source });
    if (!check.valid || !check.processed) return false;
    const now = Date.now();
    if (check.normalized === this.lastBarcode && this.lastScanAt && now - this.lastScanAt < this.cooldownMs) {
      return false;
    }
    this.isHardwareConnected = true;
    this.lastBarcode = check.normalized;
    this.lastScanAt = now;
    this.listeners.forEach((cb) => cb(check.normalized, check.processed));
    return true;
  }

  sendSimulatedScan(barcode: string): void {
    this.emitScan(barcode, 'hid');
  }
}

export const hidScannerAdapter = new HIDKeyboardWedgeAdapter();

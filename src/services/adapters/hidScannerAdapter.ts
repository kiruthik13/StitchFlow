/**
 * HID Keyboard-Wedge Scanner Adapter Interface
 *
 * Provides an abstraction for physical USB or Bluetooth barcode scanners
 * operating in Human Interface Device (HID) keyboard emulation mode.
 */
export interface BarcodeValidationResult {
  valid: boolean;
  normalized: string;
  reason?: string;
}

export function validateBarcodeFormat(raw: string): BarcodeValidationResult {
  const normalized = raw.trim().toUpperCase();
  if (!normalized) {
    return { valid: false, normalized, reason: 'Empty barcode' };
  }
  if (!/^[A-Z0-9-]{4,64}$/.test(normalized)) {
    return { valid: false, normalized, reason: 'Unsupported barcode characters or length' };
  }
  return { valid: true, normalized };
}

export interface IHIDScannerAdapter {
  isHardwareConnected: boolean;
  lastScanAt: number | null;
  onBarcodeScanned: (callback: (barcode: string) => void) => () => void;
  emitScan: (barcode: string) => boolean;
  sendSimulatedScan: (barcode: string) => void;
}

export class HIDKeyboardWedgeAdapter implements IHIDScannerAdapter {
  public isHardwareConnected = false;
  public lastScanAt: number | null = null;
  private lastBarcode = '';
  private listeners: ((barcode: string) => void)[] = [];
  private readonly cooldownMs = 1200;

  onBarcodeScanned(callback: (barcode: string) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  emitScan(barcode: string): boolean {
    const check = validateBarcodeFormat(barcode);
    if (!check.valid) return false;
    const now = Date.now();
    if (check.normalized === this.lastBarcode && this.lastScanAt && now - this.lastScanAt < this.cooldownMs) {
      return false;
    }
    this.isHardwareConnected = true;
    this.lastBarcode = check.normalized;
    this.lastScanAt = now;
    this.listeners.forEach((cb) => cb(check.normalized));
    return true;
  }

  sendSimulatedScan(barcode: string): void {
    this.emitScan(barcode);
  }
}

export const hidScannerAdapter = new HIDKeyboardWedgeAdapter();

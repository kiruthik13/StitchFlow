/**
 * HID Keyboard-Wedge Scanner Adapter Interface
 * 
 * Provides an abstraction for physical USB or Bluetooth barcode scanners
 * operating in Human Interface Device (HID) keyboard emulation mode.
 */
export interface IHIDScannerAdapter {
  isHardwareConnected: boolean;
  onBarcodeScanned: (callback: (barcode: string) => void) => () => void;
  sendSimulatedScan: (barcode: string) => void;
}

export class MockHIDScannerAdapter implements IHIDScannerAdapter {
  public isHardwareConnected: boolean = false;
  private listeners: ((barcode: string) => void)[] = [];

  onBarcodeScanned(callback: (barcode: string) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  sendSimulatedScan(barcode: string): void {
    this.listeners.forEach((cb) => cb(barcode));
  }
}

export const hidScannerAdapter = new MockHIDScannerAdapter();

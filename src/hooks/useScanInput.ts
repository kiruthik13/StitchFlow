import { useState, useCallback, useRef } from 'react';
import { validateBarcodeFormat } from '../services/adapters/hidScannerAdapter';

export interface ScanCaptureMeta {
  source: 'hid' | 'manual';
  avgKeystrokeMs: number;
}

/**
 * Hook for capturing input from an external hardware scanner (USB OTG / Bluetooth HID keyboard wedge).
 * Hardware scanners typically emit keystrokes < 60ms apart followed by Enter (\r / \n) or Tab (\t).
 */
export function useScanInput(onScan: (code: string, meta: ScanCaptureMeta) => void) {
  const [buffer, setBuffer] = useState('');
  const lastKeystrokeRef = useRef<number>(0);
  const intervalsRef = useRef<number[]>([]);

  const handleKeyInput = useCallback((char: string) => {
    const now = Date.now();
    if (char === '\n' || char === '\r' || char === '\t' || char === 'Enter' || char === 'Tab') {
      const check = validateBarcodeFormat(buffer, { inputSource: 'hid' });
      if (check.valid) {
        const intervals = intervalsRef.current;
        const avgKeystrokeMs = intervals.length
          ? Math.round(intervals.reduce((sum, v) => sum + v, 0) / intervals.length)
          : 0;
        const source: 'hid' | 'manual' = intervals.length >= 3 && avgKeystrokeMs <= 60 ? 'hid' : 'manual';
        onScan(check.normalized, { source, avgKeystrokeMs });
      }
      setBuffer('');
      intervalsRef.current = [];
      lastKeystrokeRef.current = 0;
      return;
    }

    const delta = lastKeystrokeRef.current ? now - lastKeystrokeRef.current : 0;
    if (delta > 150 && buffer.length > 0) {
      setBuffer(char);
      intervalsRef.current = [];
    } else {
      if (delta > 0) intervalsRef.current.push(delta);
      setBuffer((prev) => prev + char);
    }
    lastKeystrokeRef.current = now;
  }, [buffer, onScan]);

  return {
    buffer,
    handleKeyInput,
    resetBuffer: () => {
      setBuffer('');
      intervalsRef.current = [];
      lastKeystrokeRef.current = 0;
    },
  };
}

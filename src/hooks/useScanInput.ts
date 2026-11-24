import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for capturing input from an external hardware scanner (USB/Bluetooth HID keyboard wedge).
 * Hardware scanners usually type very fast (<30ms between keystrokes) followed by Enter.
 */
export function useScanInput(onScan: (code: string) => void) {
  const [buffer, setBuffer] = useState('');
  const [lastKeystrokeTime, setLastKeystrokeTime] = useState(0);

  const handleKeyInput = useCallback((char: string) => {
    const now = Date.now();
    if (char === '\n' || char === '\r') {
      if (buffer.trim().length > 0) {
        onScan(buffer.trim());
        setBuffer('');
      }
      return;
    }

    // If gap between keystrokes is too long (> 100ms), it's likely human typing, reset if desired
    if (now - lastKeystrokeTime > 150 && buffer.length > 0) {
      setBuffer(char);
    } else {
      setBuffer((prev) => prev + char);
    }
    setLastKeystrokeTime(now);
  }, [buffer, lastKeystrokeTime, onScan]);

  return { buffer, handleKeyInput, resetBuffer: () => setBuffer('') };
}

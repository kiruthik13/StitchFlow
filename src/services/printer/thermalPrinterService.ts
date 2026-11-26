import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share } from 'react-native';

export type ThermalFormat = 'zpl' | 'tspl';

export interface ThermalPrinterConfig {
  bridgeUrl: string;
  format: ThermalFormat;
}

const STORAGE_KEY = '@stitchflow_thermal_printer';

const DEFAULT_CONFIG: ThermalPrinterConfig = {
  bridgeUrl: '',
  format: 'zpl',
};

export async function loadPrinterConfig(): Promise<ThermalPrinterConfig> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<ThermalPrinterConfig>;
    return {
      bridgeUrl: typeof parsed.bridgeUrl === 'string' ? parsed.bridgeUrl : '',
      format: parsed.format === 'tspl' ? 'tspl' : 'zpl',
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function savePrinterConfig(config: ThermalPrinterConfig): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export async function dispatchThermalPrint(
  payload: string,
  bundleCode: string,
  config: ThermalPrinterConfig,
): Promise<{ channel: 'bridge' | 'share' }> {
  const bridge = config.bridgeUrl.trim();
  if (bridge) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(bridge, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: payload,
        signal: controller.signal,
      });
      if (response.ok) {
        return { channel: 'bridge' };
      }
    } catch {
      // Fall back to system share sheet if local print bridge is unreachable
    } finally {
      clearTimeout(timer);
    }
  }

  await Share.share({
    title: `${bundleCode} (${config.format.toUpperCase()})`,
    message: payload,
  });
  return { channel: 'share' };
}

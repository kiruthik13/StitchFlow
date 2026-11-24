import { Platform } from 'react-native';

export const typography = {
  // Font families with system fallbacks (Inter / Manrope / JetBrains Mono)
  fontFamily: {
    sansRegular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    sansMedium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
    sansSemiBold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
    sansBold: Platform.select({ ios: 'System', android: 'sans-serif-bold', default: 'System' }),
    mono: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    monoBold: Platform.select({ ios: 'Courier-Bold', android: 'monospace', default: 'monospace' }),
    sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  },

  // Font sizes — Scale strictly aligned with mobile ergonomic requirements
  fontSize: {
    xs: 11,      // Status badges: 11-12sp
    sm: 12,      // Supporting labels: 12-13sp
    base: 14,    // Body text: 14-16sp
    md: 15,
    lg: 16,
    xl: 18,      // Section headings: 18-20sp
    '2xl': 20,
    '3xl': 24,    // Screen titles: 24-28sp / KPI values: 24-28sp
    '4xl': 28,
    '5xl': 36,    // Hero production numbers: 34-38sp
    '6xl': 42,
  },

  // Line heights
  lineHeight: {
    tight: 1.15,
    snug: 1.3,
    normal: 1.45,
    relaxed: 1.6,
  },

  // Letter spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.4,
    wider: 0.8,
    widest: 1.5,
  },
} as const;

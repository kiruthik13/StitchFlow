import { Platform } from 'react-native';

export const typography = {
  // Font families with system fallbacks
  fontFamily: {
    sansRegular: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
    sansMedium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
    sansSemiBold: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
    sansBold: Platform.select({ ios: 'System', android: 'sans-serif-bold', default: 'System' }),
    mono: Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' }),
    monoBold: Platform.select({ ios: 'Courier-Bold', android: 'monospace', default: 'monospace' }),
    sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  },

  // Font sizes — 4pt base scale
  fontSize: {
    xs: 11,
    sm: 12,
    base: 14,
    md: 15,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
    '6xl': 40,
  },

  // Line heights
  lineHeight: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
  },

  // Letter spacing — only for Latin/English
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
} as const;

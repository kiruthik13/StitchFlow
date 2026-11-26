// StitchFlow — Industrial Royal Blue Design System: Light Theme
export interface ThemeTokens {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textDisabled: string;
  textInverse: string;
  brand: string;
  brandButton: string;
  brandButtonText: string;
  brandLight: string;
  brandDark: string;
  signatureLime: string; // Backward-compatible alias for primary interactive accent
  limeSoft: string;
  primaryDeep: string;
  success: string;
  successText: string;
  successLight: string;
  warning: string;
  warningText: string;
  warningLight: string;
  danger: string;
  dangerText: string;
  dangerLight: string;
  info: string;
  infoLight: string;
  overlay: string;
  shimmer1: string;
  shimmer2: string;
}

export const lightTokens: ThemeTokens = {
  background: '#F4F6F9',
  surface: '#FFFFFF',
  surfaceSecondary: '#EDF1F7',
  surfaceElevated: '#EDF1F7',
  border: '#DCE1E8',
  borderStrong: '#BCBCBC',
  textPrimary: '#182233',
  textSecondary: '#596579',
  textDisabled: '#A9A9A9',
  textInverse: '#FFFFFF',
  brand: '#4469B1',
  brandButton: '#4469B1',
  brandButtonText: '#FFFFFF',
  brandLight: '#EAF0FA',
  brandDark: '#284578',
  signatureLime: '#4469B1',
  limeSoft: '#EAF0FA',
  primaryDeep: '#284578',
  success: '#1CA64A',
  successText: '#147D38',
  successLight: '#E9F7EE',
  warning: '#FBB315',
  warningText: '#9A6500',
  warningLight: '#FFF5DB',
  danger: '#EC3327',
  dangerText: '#C52820',
  dangerLight: '#FDECE9',
  info: '#4469B1',
  infoLight: '#EAF0FA',
  overlay: 'rgba(24, 34, 51, 0.48)',
  shimmer1: '#EDF1F7',
  shimmer2: '#F4F6F9',
};

// StitchFlow — Industrial Spectrum Design System: Light Theme
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
  brandLight: string;
  brandDark: string;
  signatureLime: string; // Backward-compatible alias for primary accent (Corporate Blue)
  limeSoft: string;
  primaryDeep: string;
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  info: string;
  infoLight: string;
  overlay: string;
  shimmer1: string;
  shimmer2: string;
}

export const lightTokens: ThemeTokens = {
  background: '#F1F2F3',
  surface: '#FFFFFF',
  surfaceSecondary: '#E8EBEF',
  surfaceElevated: '#FFFFFF',
  border: '#D5D9DF',
  borderStrong: '#BCBCBC',
  textPrimary: '#172333',
  textSecondary: '#626D7B',
  textDisabled: '#A9A9A9',
  textInverse: '#FFFFFF',
  brand: '#4469B1',
  brandLight: '#E6ECF7',
  brandDark: '#284578',
  signatureLime: '#4469B1',
  limeSoft: '#E6ECF7',
  primaryDeep: '#284578',
  success: '#1CA64A',
  successLight: '#E5F4E9',
  warning: '#FBB315',
  warningLight: '#FFF3D8',
  danger: '#EC3327',
  dangerLight: '#FCEAE8',
  info: '#4469B1',
  infoLight: '#E6ECF7',
  overlay: 'rgba(23, 35, 51, 0.48)',
  shimmer1: '#E8EBEF',
  shimmer2: '#F1F2F3',
};

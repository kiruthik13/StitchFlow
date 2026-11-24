import React from 'react';
import { Text, TextProps, StyleSheet, Platform } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { typography } from '../tokens/typography';

type TextVariant =
  | 'display'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'body'
  | 'bodySmall'
  | 'caption'
  | 'label'
  | 'kpi'
  | 'code'
  | 'codeSmall';

type TextColor =
  | 'primary'
  | 'secondary'
  | 'disabled'
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'inverse'
  | 'lime';

export interface AppTextProps extends TextProps {
  children?: React.ReactNode;
  variant?: TextVariant;
  color?: TextColor;
  mono?: boolean;
  bold?: boolean;
  semiBold?: boolean;
  center?: boolean;
  uppercase?: boolean;
}

export function AppText({
  variant = 'body',
  color = 'primary',
  mono = false,
  bold = false,
  semiBold = false,
  center = false,
  uppercase = false,
  style,
  ...props
}: AppTextProps) {
  const { tokens, mode } = useThemeStore();

  const colorMap: Record<TextColor, string> = {
    primary: tokens.textPrimary,
    secondary: tokens.textSecondary,
    disabled: tokens.textDisabled,
    brand: mode === 'dark' ? tokens.signatureLime : tokens.brand,
    success: tokens.success,
    warning: tokens.warning,
    danger: tokens.danger,
    inverse: tokens.textInverse,
    lime: tokens.signatureLime,
  };

  const variantStyles = getVariantStyle(variant, mono, bold, semiBold);

  return (
    <Text
      style={[
        variantStyles,
        { color: colorMap[color] },
        center && { textAlign: 'center' },
        uppercase && { textTransform: 'uppercase' },
        style,
      ]}
      {...props}
    />
  );
}

function getVariantStyle(
  variant: TextVariant,
  mono: boolean,
  bold: boolean,
  semiBold: boolean
) {
  const isMono =
    mono || variant === 'code' || variant === 'codeSmall' || variant === 'kpi';

  const defaultFontFamily = isMono
    ? Platform.select({ android: 'monospace', ios: 'Courier', default: 'monospace' })
    : Platform.select({
      android: bold || variant === 'display' || variant === 'h1'
        ? 'sans-serif-bold'
        : semiBold || variant === 'h2' || variant === 'h3' || variant === 'h4' || variant === 'label'
          ? 'sans-serif-medium'
          : 'sans-serif',
      ios: 'System',
      default: 'System',
    });

  const base: any = {
    fontFamily: defaultFontFamily,
  };

  switch (variant) {
    case 'display':
      return {
        ...base,
        fontSize: typography.fontSize['5xl'], // 36sp
        lineHeight: 42,
        fontWeight: '800' as const,
        letterSpacing: -0.8,
      };
    case 'h1':
      return {
        ...base,
        fontSize: typography.fontSize['4xl'], // 28sp
        lineHeight: 34,
        fontWeight: '800' as const,
        letterSpacing: -0.5,
      };
    case 'h2':
      return {
        ...base,
        fontSize: typography.fontSize['3xl'], // 24sp
        lineHeight: 30,
        fontWeight: '700' as const,
        letterSpacing: -0.4,
      };
    case 'h3':
      return {
        ...base,
        fontSize: typography.fontSize['2xl'], // 20sp
        lineHeight: 26,
        fontWeight: '700' as const,
        letterSpacing: -0.3,
      };
    case 'h4':
      return {
        ...base,
        fontSize: typography.fontSize.xl, // 18sp
        lineHeight: 24,
        fontWeight: '600' as const,
        letterSpacing: -0.2,
      };
    case 'body':
      return {
        ...base,
        fontSize: typography.fontSize.base, // 14-15sp
        lineHeight: 21,
        fontWeight: bold ? ('700' as const) : ('400' as const),
      };
    case 'bodySmall':
      return {
        ...base,
        fontSize: typography.fontSize.sm, // 12-13sp
        lineHeight: 18,
        fontWeight: bold ? ('700' as const) : ('400' as const),
      };
    case 'caption':
      return {
        ...base,
        fontSize: typography.fontSize.xs, // 11-12sp
        lineHeight: 16,
        fontWeight: bold ? ('700' as const) : ('500' as const),
      };
    case 'label':
      return {
        ...base,
        fontSize: typography.fontSize.sm, // 12-13sp
        lineHeight: 18,
        fontWeight: '600' as const,
        letterSpacing: 0.15,
      };
    case 'kpi':
      return {
        ...base,
        fontSize: typography.fontSize['5xl'], // 34-36sp
        lineHeight: 40,
        fontWeight: '800' as const,
        fontVariant: ['tabular-nums'],
        letterSpacing: -0.5,
      };
    case 'code':
      return {
        ...base,
        fontSize: typography.fontSize.base,
        lineHeight: 20,
        fontWeight: '700' as const,
        fontVariant: ['tabular-nums'],
      };
    case 'codeSmall':
      return {
        ...base,
        fontSize: typography.fontSize.sm,
        lineHeight: 17,
        fontWeight: '600' as const,
        fontVariant: ['tabular-nums'],
      };
    default:
      return base;
  }
}

const styles = StyleSheet.create({});

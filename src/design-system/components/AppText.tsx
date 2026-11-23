import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
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

type TextColor = 'primary' | 'secondary' | 'disabled' | 'brand' | 'success' | 'warning' | 'danger' | 'inverse';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: TextColor;
  mono?: boolean;
  bold?: boolean;
  center?: boolean;
  uppercase?: boolean;
}

export function AppText({
  variant = 'body',
  color = 'primary',
  mono = false,
  bold = false,
  center = false,
  uppercase = false,
  style,
  ...props
}: AppTextProps) {
  const { tokens } = useThemeStore();

  const colorMap: Record<TextColor, string> = {
    primary: tokens.textPrimary,
    secondary: tokens.textSecondary,
    disabled: tokens.textDisabled,
    brand: tokens.brand,
    success: tokens.success,
    warning: tokens.warning,
    danger: tokens.danger,
    inverse: tokens.textInverse,
  };

  const variantStyles = getVariantStyle(variant, mono, bold);

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

function getVariantStyle(variant: TextVariant, mono: boolean, bold: boolean) {
  const isMono = mono || variant === 'code' || variant === 'codeSmall' || variant === 'kpi';

  const base = {
    fontFamily: isMono
      ? bold
        ? typography.fontFamily.monoBold
        : typography.fontFamily.mono
      : bold
      ? typography.fontFamily.sansBold
      : typography.fontFamily.sansRegular,
  };

  switch (variant) {
    case 'display':
      return { ...base, fontSize: typography.fontSize['5xl'], lineHeight: typography.fontSize['5xl'] * typography.lineHeight.tight, fontFamily: typography.fontFamily.sansBold };
    case 'h1':
      return { ...base, fontSize: typography.fontSize['4xl'], lineHeight: typography.fontSize['4xl'] * typography.lineHeight.tight, fontFamily: typography.fontFamily.sansBold };
    case 'h2':
      return { ...base, fontSize: typography.fontSize['3xl'], lineHeight: typography.fontSize['3xl'] * typography.lineHeight.tight, fontFamily: typography.fontFamily.sansSemiBold };
    case 'h3':
      return { ...base, fontSize: typography.fontSize['2xl'], lineHeight: typography.fontSize['2xl'] * typography.lineHeight.snug, fontFamily: typography.fontFamily.sansSemiBold };
    case 'h4':
      return { ...base, fontSize: typography.fontSize.xl, lineHeight: typography.fontSize.xl * typography.lineHeight.snug, fontFamily: typography.fontFamily.sansSemiBold };
    case 'body':
      return { ...base, fontSize: typography.fontSize.base, lineHeight: typography.fontSize.base * typography.lineHeight.normal };
    case 'bodySmall':
      return { ...base, fontSize: typography.fontSize.sm, lineHeight: typography.fontSize.sm * typography.lineHeight.normal };
    case 'caption':
      return { ...base, fontSize: typography.fontSize.xs, lineHeight: typography.fontSize.xs * typography.lineHeight.normal, fontFamily: typography.fontFamily.sansMedium };
    case 'label':
      return { ...base, fontSize: typography.fontSize.sm, lineHeight: typography.fontSize.sm * typography.lineHeight.snug, fontFamily: typography.fontFamily.sansMedium };
    case 'kpi':
      return { ...base, fontSize: typography.fontSize['4xl'], lineHeight: typography.fontSize['4xl'] * typography.lineHeight.tight, fontFamily: typography.fontFamily.monoBold };
    case 'code':
      return { ...base, fontSize: typography.fontSize.base, lineHeight: typography.fontSize.base * typography.lineHeight.normal };
    case 'codeSmall':
      return { ...base, fontSize: typography.fontSize.sm, lineHeight: typography.fontSize.sm * typography.lineHeight.normal };
    default:
      return base;
  }
}

const styles = StyleSheet.create({});

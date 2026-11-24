import React from 'react';
import {
  TouchableOpacity,
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
} from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'lime';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface AppButtonProps extends TouchableOpacityProps {
  title: string;
  onPress?: (event?: any) => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function AppButton({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const { tokens, mode } = useThemeStore();

  const isDisabled = disabled || loading;

  const bgMap: Record<ButtonVariant, string> = {
    primary: mode === 'dark' ? tokens.signatureLime : tokens.brand,
    secondary: tokens.surfaceSecondary,
    danger: tokens.danger,
    ghost: 'transparent',
    outline: 'transparent',
    lime: tokens.signatureLime,
  };

  const getTextColor = (): 'primary' | 'secondary' | 'brand' | 'inverse' | 'danger' => {
    if (variant === 'lime') return 'inverse'; // Dark forest text
    if (variant === 'primary') return mode === 'dark' ? 'inverse' : 'inverse';
    if (variant === 'secondary') return 'primary';
    if (variant === 'danger') return 'inverse';
    if (variant === 'ghost' || variant === 'outline') return 'brand';
    return 'primary';
  };

  const paddingMap: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number; minHeight: number }> = {
    sm: { paddingVertical: spacing[2], paddingHorizontal: spacing[3], minHeight: 40 },
    md: { paddingVertical: spacing[3], paddingHorizontal: spacing[4], minHeight: 48 },
    lg: { paddingVertical: spacing[3.5], paddingHorizontal: spacing[6], minHeight: 54 },
  };

  const fontSizeMap: Record<ButtonSize, 'bodySmall' | 'body' | 'md'> = {
    sm: 'bodySmall',
    md: 'body',
    lg: 'body',
  };

  // Contrast override for lime surface
  const customTextColor = (variant === 'lime' || (variant === 'primary' && mode === 'dark'))
    ? '#0D2B20'
    : undefined;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[
        styles.base,
        {
          backgroundColor: bgMap[variant],
          borderRadius: radii.xl,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderColor: variant === 'outline' ? tokens.borderStrong : 'transparent',
          opacity: isDisabled ? 0.45 : 1,
          ...paddingMap[size],
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={customTextColor || tokens.textInverse}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={{ marginRight: spacing[2] }}>{leftIcon}</View>}
          <AppText
            variant={fontSizeMap[size] as 'bodySmall' | 'body'}
            color={customTextColor ? undefined : getTextColor()}
            bold
            style={customTextColor ? { color: customTextColor, letterSpacing: 0.3 } : { letterSpacing: 0.3 }}
          >
            {title}
          </AppText>
          {rightIcon && <View style={{ marginLeft: spacing[2] }}>{rightIcon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

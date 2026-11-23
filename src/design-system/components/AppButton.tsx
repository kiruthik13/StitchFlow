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

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps extends TouchableOpacityProps {
  title: string;
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
  const { tokens } = useThemeStore();

  const isDisabled = disabled || loading;

  const bgMap: Record<ButtonVariant, string> = {
    primary: tokens.brand,
    secondary: tokens.surfaceSecondary,
    danger: tokens.danger,
    ghost: 'transparent',
    outline: 'transparent',
  };

  const textColorMap: Record<ButtonVariant, 'primary' | 'secondary' | 'brand' | 'inverse' | 'danger'> = {
    primary: 'inverse',
    secondary: 'primary',
    danger: 'inverse',
    ghost: 'brand',
    outline: 'brand',
  };

  const paddingMap: Record<ButtonSize, { paddingVertical: number; paddingHorizontal: number }> = {
    sm: { paddingVertical: spacing[1.5], paddingHorizontal: spacing[3] },
    md: { paddingVertical: spacing[2.5], paddingHorizontal: spacing[4] },
    lg: { paddingVertical: spacing[3.5], paddingHorizontal: spacing[6] },
  };

  const fontSizeMap: Record<ButtonSize, 'bodySmall' | 'body' | 'md'> = {
    sm: 'bodySmall',
    md: 'body',
    lg: 'md',
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        styles.base,
        {
          backgroundColor: bgMap[variant],
          borderRadius: radii.md,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: variant === 'outline' ? tokens.brand : 'transparent',
          opacity: isDisabled ? 0.5 : 1,
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
          color={variant === 'primary' || variant === 'danger' ? tokens.textInverse : tokens.brand}
        />
      ) : (
        <View style={styles.content}>
          {leftIcon && <View style={{ marginRight: spacing[1.5] }}>{leftIcon}</View>}
          <AppText
            variant={fontSizeMap[size] as 'bodySmall' | 'body'}
            color={textColorMap[variant]}
            bold
          >
            {title}
          </AppText>
          {rightIcon && <View style={{ marginLeft: spacing[1.5] }}>{rightIcon}</View>}
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

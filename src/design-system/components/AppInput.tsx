import React, { useState } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { typography } from '../tokens/typography';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  mono?: boolean;
}

export function AppInput({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  mono = false,
  style,
  ...props
}: AppInputProps) {
  const { tokens } = useThemeStore();
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && (
        <AppText variant="label" color="secondary" style={styles.label}>
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: tokens.surface,
            borderColor: error
              ? tokens.danger
              : focused
              ? tokens.brand
              : tokens.border,
            borderWidth: focused || error ? 1.5 : 1,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            {
              color: tokens.textPrimary,
              fontFamily: mono ? typography.fontFamily.mono : typography.fontFamily.sansRegular,
              fontSize: typography.fontSize.base,
              flex: 1,
            },
            style,
          ]}
          placeholderTextColor={tokens.textDisabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && (
        <AppText variant="caption" color="danger" style={styles.hint}>
          {error}
        </AppText>
      )}
      {hint && !error && (
        <AppText variant="caption" color="secondary" style={styles.hint}>
          {hint}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing[3],
  },
  label: {
    marginBottom: spacing[1],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.md,
    paddingHorizontal: spacing[3],
    minHeight: 48,
  },
  input: {
    paddingVertical: spacing[2.5],
  },
  leftIcon: {
    marginRight: spacing[2],
  },
  rightIcon: {
    marginLeft: spacing[2],
  },
  hint: {
    marginTop: spacing[0.5],
    marginLeft: spacing[1],
  },
});

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';

export interface QuantityStepperProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function QuantityStepper({ label, value, onChange, min = 0, max = 9999, step = 1 }: QuantityStepperProps) {
  const { tokens } = useThemeStore();

  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
    <View>
      {label && (
        <AppText variant="caption" color="secondary" uppercase style={{ marginBottom: spacing[1.5], letterSpacing: 0.5 }}>
          {label}
        </AppText>
      )}
      <View style={[styles.wrapper, { backgroundColor: tokens.surfaceSecondary, borderColor: tokens.border }]}>
        <TouchableOpacity
          onPress={decrement}
          disabled={value <= min}
          style={[styles.btn, { opacity: value <= min ? 0.4 : 1 }]}
        >
          <AppText variant="h3" color="brand">−</AppText>
        </TouchableOpacity>
        <AppText
          variant="h3"
          mono
          style={{ color: tokens.textPrimary, minWidth: 56, textAlign: 'center' }}
        >
          {value}
        </AppText>
        <TouchableOpacity
          onPress={increment}
          disabled={value >= max}
          style={[styles.btn, { opacity: value >= max ? 0.4 : 1 }]}
        >
          <AppText variant="h3" color="brand">+</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  btn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
  },
});

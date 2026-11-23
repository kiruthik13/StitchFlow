import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function QuantityStepper({ value, onChange, min = 0, max = 9999, step = 1 }: QuantityStepperProps) {
  const { tokens } = useThemeStore();

  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  return (
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

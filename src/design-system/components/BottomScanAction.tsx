import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';

interface BottomScanActionProps {
  onPress: () => void;
  label?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export function BottomScanAction({ onPress, label = 'Scan Barcode / QR', icon, disabled = false }: BottomScanActionProps) {
  const { tokens } = useThemeStore();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, spacing[3]),
          backgroundColor: tokens.background,
          borderTopColor: tokens.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        disabled={disabled}
        style={[
          styles.btn,
          {
            backgroundColor: disabled ? tokens.textDisabled : tokens.brand,
          },
        ]}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <AppText variant="body" color="inverse" bold>
          {label}
        </AppText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  btn: {
    borderRadius: 10,
    paddingVertical: spacing[3.5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: spacing[2],
  },
});

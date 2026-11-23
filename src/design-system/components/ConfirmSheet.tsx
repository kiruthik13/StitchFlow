import React from 'react';
import { View, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { AppButton } from './AppButton';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmSheetProps) {
  const { tokens } = useThemeStore();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[styles.overlay, { backgroundColor: tokens.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: tokens.surface }]}>
          <AppText variant="h3" style={{ marginBottom: spacing[2] }}>
            {title}
          </AppText>
          <AppText variant="body" color="secondary" style={{ marginBottom: spacing[6] }}>
            {message}
          </AppText>
          <View style={styles.btnRow}>
            <AppButton
              title={cancelLabel}
              variant="secondary"
              onPress={onCancel}
              style={{ flex: 1, marginRight: spacing[2] }}
            />
            <AppButton
              title={confirmLabel}
              variant={variant === 'danger' ? 'danger' : 'primary'}
              onPress={onConfirm}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  sheet: {
    borderTopLeftRadius: radii['2xl'],
    borderTopRightRadius: radii['2xl'],
    padding: spacing[6],
    paddingBottom: spacing[8],
  },
  btnRow: {
    flexDirection: 'row',
  },
});

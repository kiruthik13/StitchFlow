import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { typography } from '../tokens/typography';

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

export function SearchField({ value, onChangeText, placeholder = 'Search...', onClear }: SearchFieldProps) {
  const { tokens } = useThemeStore();

  return (
    <View style={[styles.wrapper, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
      <AppText variant="caption" color="secondary" style={styles.icon}>🔍</AppText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={tokens.textDisabled}
        style={[styles.input, { color: tokens.textPrimary, fontFamily: typography.fontFamily.sansRegular, fontSize: typography.fontSize.base }]}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => { onChangeText(''); onClear?.(); }}>
          <AppText variant="caption" color="secondary" style={styles.clear}>✕</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.lg,
    paddingHorizontal: spacing[3],
    height: 44,
  },
  icon: { marginRight: spacing[2] },
  input: { flex: 1 },
  clear: { marginLeft: spacing[2] },
});

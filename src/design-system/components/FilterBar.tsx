import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';

interface FilterOption {
  key: string;
  label: string;
}

interface FilterBarProps {
  options: FilterOption[];
  selected: string;
  onSelect: (key: string) => void;
}

export function FilterBar({ options, selected, onSelect }: FilterBarProps) {
  const { tokens } = useThemeStore();

  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const isSelected = opt.key === selected;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onSelect(opt.key)}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? tokens.brand : tokens.surface,
                borderColor: isSelected ? tokens.brand : tokens.border,
              },
            ]}
          >
            <AppText
              variant="label"
              style={{ color: isSelected ? tokens.textInverse : tokens.textSecondary }}
            >
              {opt.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    borderWidth: 1,
  },
});

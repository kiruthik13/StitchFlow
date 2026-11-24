import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { ScanLine, ArrowUpRight } from 'lucide-react-native';

export interface ScannerActionCardProps {
  title?: string;
  description?: string;
  onPress: () => void;
}

export function ScannerActionCard({
  title = 'Scan Bundle QR / Barcode',
  description = 'Point camera or trigger handheld HID scanner',
  onPress,
}: ScannerActionCardProps) {
  const { tokens, mode } = useThemeStore();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: tokens.signatureLime,
        },
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.iconCircle}>
          <ScanLine size={24} color="#0D2B20" strokeWidth={2.4} />
        </View>
        <View style={styles.textContainer}>
          <AppText style={styles.title}>{title}</AppText>
          <AppText style={styles.description}>{description}</AppText>
        </View>
        <View style={styles.arrowCircle}>
          <ArrowUpRight size={18} color="#0D2B20" strokeWidth={2.4} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.hero,
    padding: spacing[4],
    minHeight: 74,
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: 'rgba(13, 43, 32, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0D2B20',
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 12,
    color: '#153D2D',
    marginTop: 2,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: 'rgba(13, 43, 32, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing[2],
  },
});

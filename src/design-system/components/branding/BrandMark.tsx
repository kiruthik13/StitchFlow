import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { StitchFlowLogo } from './StitchFlowLogo';
import { StitchFlowWordmark } from './StitchFlowWordmark';
import { spacing } from '../../tokens/spacing';

export interface BrandMarkProps {
  logoSize?: number;
  fontSize?: number;
  layout?: 'horizontal' | 'vertical';
  withBackground?: boolean;
  style?: ViewStyle;
}

export function BrandMark({
  logoSize = 32,
  fontSize = 22,
  layout = 'horizontal',
  withBackground = false,
  style,
}: BrandMarkProps) {
  return (
    <View
      style={[
        styles.container,
        layout === 'vertical' ? styles.vertical : styles.horizontal,
        style,
      ]}
    >
      <StitchFlowLogo size={logoSize} withBackground={withBackground} />
      <View style={layout === 'vertical' ? styles.vertSpacing : styles.horizSpacing}>
        <StitchFlowWordmark fontSize={fontSize} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  horizontal: {
    flexDirection: 'row',
  },
  vertical: {
    flexDirection: 'column',
  },
  horizSpacing: {
    marginLeft: spacing[2.5],
  },
  vertSpacing: {
    marginTop: spacing[2],
  },
});

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import { AppText } from '../AppText';

export interface StitchFlowWordmarkProps {
  fontSize?: number;
  color?: string;
  style?: ViewStyle;
}

export function StitchFlowWordmark({
  fontSize = 20,
  color,
  style,
}: StitchFlowWordmarkProps) {
  const { tokens } = useThemeStore();
  const textColor = color || tokens.textPrimary;

  return (
    <View style={[styles.container, style]}>
      <AppText
        bold
        style={[
          styles.text,
          {
            fontSize,
            color: textColor,
            lineHeight: fontSize * 1.2,
          },
        ]}
      >
        Stitch<AppText bold style={{ color: tokens.signatureLime }}>Flow</AppText>
      </AppText>
      <View
        style={[
          styles.seamDot,
          {
            backgroundColor: tokens.signatureLime,
            width: fontSize * 0.22,
            height: fontSize * 0.22,
            borderRadius: (fontSize * 0.22) / 2,
            marginLeft: fontSize * 0.15,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    letterSpacing: -0.6,
    fontFamily: 'sans-serif-bold',
  },
  seamDot: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
});

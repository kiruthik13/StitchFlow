import React, { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { radii } from '../tokens/radii';
import { spacing } from '../tokens/spacing';

interface LoadingSkeletonProps {
  lines?: number;
  height?: number;
}

export function LoadingSkeleton({ lines = 3, height = 18 }: LoadingSkeletonProps) {
  const { tokens } = useThemeStore();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    let active = true;
    let anim: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!active || reduced) return;
      anim = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.45, duration: 750, useNativeDriver: true }),
        ]),
      );
      anim.start();
    });
    return () => {
      active = false;
      anim?.stop();
    };
  }, [opacity]);

  return (
    <View style={styles.stack}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Animated.View
          key={idx}
          style={[
            styles.bar,
            {
              height,
              width: idx === lines - 1 ? '68%' : '100%',
              backgroundColor: tokens.shimmer1,
              borderRadius: radii.md,
              opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing[2] },
  bar: { width: '100%' },
});

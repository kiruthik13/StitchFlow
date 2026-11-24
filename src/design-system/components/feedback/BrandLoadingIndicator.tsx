import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, AccessibilityInfo } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

export interface BrandLoadingIndicatorProps {
  variant?: 'bar' | 'stitch' | 'pulse';
  width?: number;
  height?: number;
  size?: number;
  trackColor?: string;
  indicatorColor?: string;
  style?: ViewStyle;
  progress?: number; // 0 to 1, if controlled
}

export function BrandLoadingIndicator({
  variant = 'bar',
  width = 110,
  height = 3.5,
  size = 32,
  trackColor = '#3B5146',
  indicatorColor = '#C9EF45',
  style,
  progress,
}: BrandLoadingIndicatorProps) {
  const animatedProgress = useSharedValue(0);
  const pulseOpacity = useSharedValue(0.4);
  const stitchRotate = useSharedValue(0);

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!isMounted) return;

      if (reduced) {
        animatedProgress.value = 1;
        pulseOpacity.value = 1;
        return;
      }

      if (variant === 'bar') {
        if (typeof progress === 'number') {
          animatedProgress.value = withTiming(Math.min(1, Math.max(0, progress)), {
            duration: 300,
            easing: Easing.out(Easing.quad),
          });
        } else {
          // Infinite loop progress bar
          animatedProgress.value = withRepeat(
            withSequence(
              withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) }),
              withTiming(0, { duration: 0 })
            ),
            -1,
            false
          );
        }
      } else if (variant === 'stitch') {
        stitchRotate.value = withRepeat(
          withTiming(360, { duration: 1400, easing: Easing.linear }),
          -1,
          false
        );
      } else if (variant === 'pulse') {
        pulseOpacity.value = withRepeat(
          withSequence(
            withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }),
            withTiming(0.35, { duration: 600, easing: Easing.inOut(Easing.quad) })
          ),
          -1,
          true
        );
      }
    });

    return () => {
      isMounted = false;
    };
  }, [variant, progress]);

  const barAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scaleX: animatedProgress.value,
        },
      ],
    };
  });

  const stitchAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${stitchRotate.value}deg` }],
    };
  });

  const pulseAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: pulseOpacity.value,
    };
  });

  if (variant === 'stitch') {
    return (
      <View style={[{ width: size, height: size }, styles.center, style]}>
        <Animated.View style={[stitchAnimatedStyle]}>
          <Svg width={size} height={size} viewBox="0 0 40 40">
            {/* Outer track loop */}
            <Path
              d="M20 6 A14 14 0 1 1 6 20"
              fill="none"
              stroke={trackColor}
              strokeWidth="3"
              strokeLinecap="round"
            />
            {/* Active stitch accent */}
            <Path
              d="M20 6 A14 14 0 0 1 34 20"
              fill="none"
              stroke={indicatorColor}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="4 6"
            />
          </Svg>
        </Animated.View>
      </View>
    );
  }

  if (variant === 'pulse') {
    return (
      <Animated.View
        style={[
          styles.pulseDot,
          {
            width: size * 0.4,
            height: size * 0.4,
            borderRadius: (size * 0.4) / 2,
            backgroundColor: indicatorColor,
          },
          pulseAnimatedStyle,
          style,
        ]}
      />
    );
  }

  // Bar variant
  return (
    <View
      style={[
        styles.barTrack,
        {
          width,
          height,
          borderRadius: height,
          backgroundColor: trackColor,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.barIndicator,
          {
            backgroundColor: indicatorColor,
            borderRadius: height,
          },
          barAnimatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  barTrack: {
    overflow: 'hidden',
    position: 'relative',
  },
  barIndicator: {
    height: '100%',
    width: '100%',
    transformOrigin: 'left',
  },
  pulseDot: {
    alignSelf: 'center',
  },
});

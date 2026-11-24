import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, AccessibilityInfo } from 'react-native';
import Svg, { Path, G, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

export interface StitchFlowAnimatedLogoProps {
  size?: number;
  autoPlay?: boolean;
  onAnimationComplete?: () => void;
  style?: ViewStyle;
  compact?: boolean;
  loop?: boolean;
}

const THREAD_PATH_D = 'M119 29 C64 11 27 41 43 64 C54 80 115 78 119 104 C123 132 71 146 34 125';
const LIME_ACCENT_1 = 'M107 26 L128 32';
const LIME_ACCENT_2 = 'M26 122 L44 130';
const PATH_LENGTH = 400;

export function StitchFlowAnimatedLogo({
  size = 145,
  autoPlay = true,
  onAnimationComplete,
  style,
  compact = false,
  loop = false,
}: StitchFlowAnimatedLogoProps) {
  const drawProgress = useSharedValue(0);
  const seamOpacity = useSharedValue(0);
  const detailsOpacity = useSharedValue(0);
  const accentsOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!isMounted) return;

      if (reduced) {
        drawProgress.value = 1;
        seamOpacity.value = 1;
        detailsOpacity.value = 1;
        accentsOpacity.value = 1;
        if (onAnimationComplete) {
          onAnimationComplete();
        }
        return;
      }

      if (autoPlay) {
        startAnimation();
      }
    });

    return () => {
      isMounted = false;
    };
  }, [autoPlay]);

  const startAnimation = () => {
    drawProgress.value = 0;
    seamOpacity.value = 0;
    detailsOpacity.value = 0;
    accentsOpacity.value = 0;
    glowScale.value = 1;

    // 1. Thread draws smoothly along the S-curve (0.1s to 1.45s)
    drawProgress.value = withDelay(
      100,
      withTiming(1, {
        duration: 1350,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
      })
    );

    // 2. Lime accents reveal (at ~0.9s)
    accentsOpacity.value = withDelay(
      900,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) })
    );

    // 3. Garment stitching seam appears (at ~1.2s)
    seamOpacity.value = withDelay(
      1200,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) })
    );

    // 4. Factory, sewing machine, and t-shirt elements reveal (at ~1.4s)
    detailsOpacity.value = withDelay(
      1400,
      withTiming(1, { duration: 550, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished && onAnimationComplete) {
          runOnJS(onAnimationComplete)();
        }
      })
    );

    // 5. Subtle assembly pulse
    glowScale.value = withDelay(
      1800,
      withSequence(
        withTiming(1.035, { duration: 250, easing: Easing.out(Easing.quad) }),
        withTiming(1.0, { duration: 250, easing: Easing.inOut(Easing.quad) })
      )
    );
  };

  const animatedThreadProps = useAnimatedProps(() => {
    'worklet';
    const offset = PATH_LENGTH * (1 - drawProgress.value);
    return {
      strokeDashoffset: offset,
    };
  });

  const animatedSeamProps = useAnimatedProps(() => {
    'worklet';
    return {
      opacity: seamOpacity.value,
    };
  });

  const animatedAccentsProps = useAnimatedProps(() => {
    'worklet';
    return {
      opacity: accentsOpacity.value,
    };
  });

  const animatedDetailsProps = useAnimatedProps(() => {
    'worklet';
    return {
      opacity: detailsOpacity.value,
    };
  });

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: glowScale.value }],
    };
  });

  if (compact) {
    return (
      <View style={[{ width: size, height: size }, styles.center, style]}>
        <Svg width={size} height={size} viewBox="0 0 160 160">
          {/* Compact static/instant or simplified stitch emblem */}
          <Path
            d={THREAD_PATH_D}
            fill="none"
            stroke="#F4F3EE"
            strokeWidth="24"
            strokeLinecap="round"
          />
          <Path
            d={THREAD_PATH_D}
            fill="none"
            stroke="#153D2D"
            strokeWidth="2.5"
            strokeDasharray="5 8"
            strokeLinecap="round"
          />
          <Path
            d={`${LIME_ACCENT_1} ${LIME_ACCENT_2}`}
            fill="none"
            stroke="#C9EF45"
            strokeWidth="12"
            strokeLinecap="round"
          />
        </Svg>
      </View>
    );
  }

  return (
    <Animated.View
      style={[{ width: size, height: size }, styles.center, containerAnimatedStyle, style]}
    >
      <Svg width={size} height={size} viewBox="0 0 160 160">
        {/* Layer 1: Animated Electric Lime Ribbon Terminals */}
        <AnimatedPath
          d={`${LIME_ACCENT_1} ${LIME_ACCENT_2}`}
          fill="none"
          stroke="#C9EF45"
          strokeWidth="12"
          strokeLinecap="round"
          animatedProps={animatedAccentsProps}
        />

        {/* Layer 2: Animated S-shaped Warm Ivory Thread Ribbon */}
        <AnimatedPath
          d={THREAD_PATH_D}
          fill="none"
          stroke="#F4F3EE"
          strokeWidth="24"
          strokeLinecap="round"
          strokeDasharray={PATH_LENGTH}
          animatedProps={animatedThreadProps}
        />

        {/* Layer 3: Industrial Garment Seam Dash Stitching */}
        <AnimatedPath
          d={THREAD_PATH_D}
          fill="none"
          stroke="#153D2D"
          strokeWidth="2.5"
          strokeDasharray="5 8"
          strokeLinecap="round"
          animatedProps={animatedSeamProps}
        />

        {/* Layer 4: Manufacturing Silhouettes Revealed within S-Curve Loops */}
        <AnimatedG animatedProps={animatedDetailsProps}>
          {/* Top-Right Loop: Industrial Sawtooth Factory */}
          <Path
            d="M86 49 L86 44 L91 40 L91 44 L96 40 L96 44 L101 40 L101 49 Z"
            fill="#153D2D"
          />
          <Rect x="88" y="46" width="1.8" height="2" fill="#C9EF45" />
          <Rect x="93" y="46" width="1.8" height="2" fill="#C9EF45" />
          <Rect x="98" y="46" width="1.8" height="2" fill="#C9EF45" />

          {/* Center Loop: Industrial Sewing Machine on Ribbon */}
          {/* Machine Body */}
          <Path
            d="M71 83 L91 83 L91 81 L87 81 L87 73 L74 73 L74 76 L84 76 L84 81 L71 81 Z"
            fill="#153D2D"
          />
          {/* Needle & Thread Lock */}
          <Path d="M75 76 L75 80" stroke="#153D2D" strokeWidth="1.2" strokeLinecap="round" />
          <Path d="M87 75 L89 75" stroke="#C9EF45" strokeWidth="1.2" strokeLinecap="round" />

          {/* Bottom-Left Loop: Garment / T-Shirt on Hanger */}
          {/* Hanger Hook */}
          <Path
            d="M59 98 C59 96 61 96 61 98 L61 100 L54 103 L66 103 Z"
            fill="none"
            stroke="#153D2D"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* T-Shirt Outline */}
          <Path
            d="M54 103 L51 106 L53 108 L55 106 L55 115 L65 115 L65 106 L67 108 L69 106 L66 103 Z"
            fill="#153D2D"
          />
        </AnimatedG>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

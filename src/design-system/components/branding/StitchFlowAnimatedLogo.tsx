import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, AccessibilityInfo } from 'react-native';
import Svg, { Path, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);
const AnimatedG = Animated.createAnimatedComponent(G);

export interface StitchFlowAnimatedLogoProps {
  size?: number;
  autoPlay?: boolean;
  onAnimationComplete?: () => void;
  style?: ViewStyle;
  compact?: boolean;
  loop?: boolean;
}

// Faithful vector geometry matching the approved StitchFlow symbol:
// 1) Upper & lower blue S-shaped garment ribbons
// 2) White dashed centerline stitches
// 3) Silver/gray inner ribbon folds
// 4) Three ascending production bars (Red, Amber, Green)
// 5) Upward blue growth arrow
const UPPER_RIBBON_D =
  'M26 70 C18 46 38 18 96 18 L128 18 L116 40 L76 40 C50 40 36 52 34 72 Z';
const LOWER_RIBBON_D =
  'M134 90 C142 114 122 142 64 142 L26 142 L42 120 L84 120 C110 120 124 108 126 88 Z';
const UPPER_STITCH_D = 'M30 62 C32 40 50 29 82 29 L118 29';
const LOWER_STITCH_D = 'M130 98 C128 120 110 131 78 131 L40 131';
const UPPER_FOLD_D = 'M36 66 C42 52 54 44 68 48 L96 56 L92 68 L58 64 C46 64 38 74 44 86 Z';
const LOWER_FOLD_D = 'M124 94 C118 108 106 116 92 112 L68 104 L74 92 L102 96 C114 96 122 86 116 74 Z';
const ARROW_SHAFT_D = 'M34 114 C64 106 94 84 116 54';
const ARROW_HEAD_D = 'M105 54 L121 48 L119 65 Z';

export function StitchFlowAnimatedLogo({
  size = 148,
  autoPlay = true,
  onAnimationComplete,
  style,
  compact = false,
}: StitchFlowAnimatedLogoProps) {
  const ribbonOpacity = useSharedValue(compact ? 1 : 0);
  const stitchProgress = useSharedValue(compact ? 1 : 0);
  const foldOpacity = useSharedValue(compact ? 1 : 0);
  const bar1Scale = useSharedValue(compact ? 1 : 0);
  const bar2Scale = useSharedValue(compact ? 1 : 0);
  const bar3Scale = useSharedValue(compact ? 1 : 0);
  const arrowProgress = useSharedValue(compact ? 1 : 0);
  const arrowHeadOpacity = useSharedValue(compact ? 1 : 0);

  useEffect(() => {
    let isMounted = true;

    if (compact) return;

    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!isMounted) return;

      if (reduced) {
        ribbonOpacity.value = 1;
        stitchProgress.value = 1;
        foldOpacity.value = 1;
        bar1Scale.value = 1;
        bar2Scale.value = 1;
        bar3Scale.value = 1;
        arrowProgress.value = 1;
        arrowHeadOpacity.value = 1;
        onAnimationComplete?.();
        return;
      }

      if (autoPlay) {
        startChoreography();
      }
    });

    return () => {
      isMounted = false;
    };
  }, [autoPlay, compact]);

  const startChoreography = () => {
    // Stage 2 (400-900ms): Blue S-shaped ribbon formation
    ribbonOpacity.value = withDelay(
      350,
      withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) })
    );

    // Stage 3 (900-1200ms): White dashed stitching + silver folds
    stitchProgress.value = withDelay(
      820,
      withTiming(1, { duration: 380, easing: Easing.out(Easing.quad) })
    );
    foldOpacity.value = withDelay(
      880,
      withTiming(1, { duration: 320, easing: Easing.out(Easing.quad) })
    );

    // Stage 4 (1200-1600ms): Red, Amber, Green production bars grow bottom-to-top sequentially
    bar1Scale.value = withDelay(
      1180,
      withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) })
    );
    bar2Scale.value = withDelay(
      1310,
      withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) })
    );
    bar3Scale.value = withDelay(
      1440,
      withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) })
    );

    // Stage 5 (1600-1900ms): Upward blue growth arrow sweeps along path
    arrowProgress.value = withDelay(
      1580,
      withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) })
    );
    arrowHeadOpacity.value = withDelay(
      1780,
      withTiming(1, { duration: 150, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished && onAnimationComplete) {
          runOnJS(onAnimationComplete)();
        }
      })
    );
  };

  const ribbonProps = useAnimatedProps(() => ({
    opacity: ribbonOpacity.value,
  }));

  const foldProps = useAnimatedProps(() => ({
    opacity: foldOpacity.value,
  }));

  const stitchProps = useAnimatedProps(() => ({
    opacity: stitchProgress.value,
    strokeDashoffset: 140 * (1 - stitchProgress.value),
  }));

  const bar1Props = useAnimatedProps(() => ({
    height: 22 * bar1Scale.value,
    y: 94 - 22 * bar1Scale.value,
  }));

  const bar2Props = useAnimatedProps(() => ({
    height: 30 * bar2Scale.value,
    y: 90 - 30 * bar2Scale.value,
  }));

  const bar3Props = useAnimatedProps(() => ({
    height: 38 * bar3Scale.value,
    y: 86 - 38 * bar3Scale.value,
  }));

  const arrowShaftProps = useAnimatedProps(() => ({
    strokeDashoffset: 120 * (1 - arrowProgress.value),
    opacity: arrowProgress.value > 0.02 ? 1 : 0,
  }));

  const arrowHeadProps = useAnimatedProps(() => ({
    opacity: arrowHeadOpacity.value,
  }));

  return (
    <View style={[{ width: size, height: size }, styles.center, style]}>
      <Svg width={size} height={size} viewBox="0 0 160 160">
        <Defs>
          <LinearGradient id="sfBlueGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#0B5EC7" />
            <Stop offset="1" stopColor="#284578" />
          </LinearGradient>
          <LinearGradient id="sfSilverGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#A9A9A9" />
            <Stop offset="1" stopColor="#D5D9DF" />
          </LinearGradient>
        </Defs>

        {/* Stage 3: Silver / Gray Inner Folds */}
        <AnimatedG animatedProps={foldProps}>
          <Path d={UPPER_FOLD_D} fill="url(#sfSilverGrad)" />
          <Path d={LOWER_FOLD_D} fill="url(#sfSilverGrad)" />
        </AnimatedG>

        {/* Stage 2: Blue S-Shaped Garment Ribbon */}
        <AnimatedG animatedProps={ribbonProps}>
          <Path d={UPPER_RIBBON_D} fill="url(#sfBlueGrad)" />
          <Path d={LOWER_RIBBON_D} fill="url(#sfBlueGrad)" />
        </AnimatedG>

        {/* Stage 3: White Dashed Garment Stitching */}
        <AnimatedPath
          d={UPPER_STITCH_D}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeDasharray="6 5"
          strokeLinecap="round"
          animatedProps={stitchProps}
        />
        <AnimatedPath
          d={LOWER_STITCH_D}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeDasharray="6 5"
          strokeLinecap="round"
          animatedProps={stitchProps}
        />

        {/* Stage 4: Three Ascending Production Bars (Red, Amber, Green) */}
        <AnimatedRect x="48" width="13" rx="3" fill="#EC3327" animatedProps={bar1Props} />
        <AnimatedRect x="67" width="13" rx="3" fill="#FBB315" animatedProps={bar2Props} />
        <AnimatedRect x="86" width="13" rx="3" fill="#1CA64A" animatedProps={bar3Props} />

        {/* Stage 5: Upward Corporate Blue Growth Arrow */}
        <AnimatedPath
          d={ARROW_SHAFT_D}
          fill="none"
          stroke="#0B5EC7"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="120"
          animatedProps={arrowShaftProps}
        />
        <AnimatedPath
          d={ARROW_HEAD_D}
          fill="#0B5EC7"
          animatedProps={arrowHeadProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

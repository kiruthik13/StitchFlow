import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AccessibilityInfo,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { StitchFlowAnimatedLogo } from '../branding/StitchFlowAnimatedLogo';
import { BrandLoadingIndicator } from '../feedback/BrandLoadingIndicator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface AnimatedBrandSplashProps {
  isReady?: boolean;
  onAnimationComplete?: () => void;
  minDuration?: number; // target duration, default 2400ms
}

export function AnimatedBrandSplash({
  isReady = false,
  onAnimationComplete,
  minDuration = 2400,
}: AnimatedBrandSplashProps) {
  const [animationFinished, setAnimationFinished] = useState(false);
  const [hasReducedMotion, setHasReducedMotion] = useState(false);
  const completionCalledRef = useRef(false);

  // Reanimated shared values
  const splashOpacity = useSharedValue(1);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkTranslateY = useSharedValue(12);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(8);
  const loaderOpacity = useSharedValue(0);

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (!isMounted) return;
      if (reduced) {
        setHasReducedMotion(true);
        wordmarkOpacity.value = 1;
        wordmarkTranslateY.value = 0;
        taglineOpacity.value = 1;
        taglineTranslateY.value = 0;
        loaderOpacity.value = 1;
        setAnimationFinished(true);
        return;
      }

      // 1. Reveal Wordmark with smooth vertical translation at 1.45s
      wordmarkOpacity.value = withDelay(
        1450,
        withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) })
      );
      wordmarkTranslateY.value = withDelay(
        1450,
        withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) })
      );

      // 2. Reveal Tagline at 1.70s
      taglineOpacity.value = withDelay(
        1700,
        withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) })
      );
      taglineTranslateY.value = withDelay(
        1700,
        withTiming(0, { duration: 400, easing: Easing.out(Easing.quad) })
      );

      // 3. Reveal Signature-Lime Loader at 1.80s
      loaderOpacity.value = withDelay(
        1800,
        withTiming(1, { duration: 350, easing: Easing.out(Easing.quad) })
      );

      // 4. Mark minimum splash sequence completed at target duration (~2.4s)
      const timer = setTimeout(() => {
        if (isMounted) {
          setAnimationFinished(true);
        }
      }, minDuration);

      return () => {
        clearTimeout(timer);
      };
    });

    return () => {
      isMounted = false;
    };
  }, [minDuration]);

  // When both the animated sequence has finished AND the app is ready:
  useEffect(() => {
    if (animationFinished && isReady && !completionCalledRef.current) {
      completionCalledRef.current = true;

      if (hasReducedMotion) {
        if (onAnimationComplete) {
          onAnimationComplete();
        }
        return;
      }

      // Smooth cinematic fade-out transition to the main app screen
      splashOpacity.value = withTiming(
        0,
        {
          duration: 380,
          easing: Easing.inOut(Easing.quad),
        },
        (finished) => {
          if (finished && onAnimationComplete) {
            runOnJS(onAnimationComplete)();
          }
        }
      );
    }
  }, [animationFinished, isReady, hasReducedMotion]);

  const containerAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: splashOpacity.value,
    };
  });

  const wordmarkAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: wordmarkOpacity.value,
      transform: [{ translateY: wordmarkTranslateY.value }],
    };
  });

  const taglineAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: taglineOpacity.value,
      transform: [{ translateY: taglineTranslateY.value }],
    };
  });

  const loaderAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: loaderOpacity.value,
    };
  });

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <StatusBar style="light" />

      {/* Main Brand Assembly Stage */}
      <View style={styles.stage}>
        {/* Animated StitchFlow Ribbon Emblem */}
        <StitchFlowAnimatedLogo size={150} autoPlay={!hasReducedMotion} />

        {/* Wordmark: Stitch (Warm Ivory) + Flow (Signature Lime) */}
        <Animated.View style={[styles.wordmarkRow, wordmarkAnimatedStyle]}>
          <Text style={styles.stitchText}>Stitch</Text>
          <Text style={styles.flowText}>Flow</Text>
        </Animated.View>

        {/* Tagline: Industrial Production Intelligence */}
        <Animated.View style={taglineAnimatedStyle}>
          <Text style={styles.taglineText}>GARMENT PRODUCTION INTELLIGENCE</Text>
        </Animated.View>

        {/* Signature-Lime Industrial Loading Indicator */}
        <Animated.View style={[styles.loaderWrapper, loaderAnimatedStyle]}>
          <BrandLoadingIndicator
            variant="bar"
            width={100}
            height={3}
            trackColor="#3B5146"
            indicatorColor="#C9EF45"
          />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#102D23',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
  },
  stitchText: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.4,
    color: '#F4F3EE',
    fontFamily: 'sans-serif-bold',
  },
  flowText: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.4,
    color: '#C9EF45',
    fontFamily: 'sans-serif-bold',
  },
  taglineText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2.2,
    marginTop: 10,
    color: '#B9C9BD',
    textTransform: 'uppercase',
  },
  loaderWrapper: {
    marginTop: 34,
  },
});

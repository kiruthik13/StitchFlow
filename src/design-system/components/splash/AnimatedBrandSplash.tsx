import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AccessibilityInfo,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useThemeStore } from '../../../store/themeStore';
import { StitchFlowAnimatedLogo } from '../branding/StitchFlowAnimatedLogo';
import { BrandLoadingIndicator } from '../feedback/BrandLoadingIndicator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface AnimatedBrandSplashProps {
  isReady?: boolean;
  onAnimationComplete?: () => void;
  minDuration?: number; // target 2.2-2.4s choreography
}

/**
 * "From Stitch to Intelligence" — Signature StitchFlow Startup Experience.
 * Matches native splash background (#FFFFFF light / #11161E dark) for zero flash.
 */
export function AnimatedBrandSplash({
  isReady = false,
  onAnimationComplete,
  minDuration = 2350,
}: AnimatedBrandSplashProps) {
  const { tokens, mode } = useThemeStore();
  const { t } = useTranslation('common');
  const [animationFinished, setAnimationFinished] = useState(false);
  const [hasReducedMotion, setHasReducedMotion] = useState(false);
  const completionCalledRef = useRef(false);

  const splashOpacity = useSharedValue(1);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkTranslateY = useSharedValue(10);
  const taglineOpacity = useSharedValue(0);
  const taglineTranslateY = useSharedValue(6);
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

      // Stage 6 (1900-2200ms): Reveal official StitchFlow wordmark + PRODUCTION INTELLIGENCE tagline
      wordmarkOpacity.value = withDelay(
        1850,
        withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) })
      );
      wordmarkTranslateY.value = withDelay(
        1850,
        withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) })
      );

      taglineOpacity.value = withDelay(
        1980,
        withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) })
      );
      taglineTranslateY.value = withDelay(
        1980,
        withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) })
      );

      loaderOpacity.value = withDelay(
        2050,
        withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) })
      );

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

  // Stage 7 (~2200-2400ms): Seamless transition when app initialization is ready
  useEffect(() => {
    if (animationFinished && isReady && !completionCalledRef.current) {
      completionCalledRef.current = true;

      if (hasReducedMotion) {
        onAnimationComplete?.();
        return;
      }

      splashOpacity.value = withTiming(
        0,
        {
          duration: 300,
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

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
  }));

  const wordmarkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkTranslateY.value }],
  }));

  const taglineAnimatedStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
    transform: [{ translateY: taglineTranslateY.value }],
  }));

  const loaderAnimatedStyle = useAnimatedStyle(() => ({
    opacity: loaderOpacity.value,
  }));

  const bgColor = mode === 'dark' ? '#11161E' : '#FFFFFF';
  const stitchColor = mode === 'dark' ? '#F1F4F8' : '#0C234B';
  const flowColor = mode === 'dark' ? '#7899D8' : '#0B5EC7';
  const taglineColor = mode === 'dark' ? '#A9A9A9' : '#626D7B';

  return (
    <Animated.View style={[styles.container, { backgroundColor: bgColor }, containerAnimatedStyle]}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />

      <View style={styles.stage}>
        {/* Stages 2-5: From Stitch to Intelligence Symbol Reveal */}
        <StitchFlowAnimatedLogo size={148} autoPlay={!hasReducedMotion} />

        {/* Stage 6: Wordmark + Official Tagline (no colored bars below) */}
        <Animated.View style={[styles.wordmarkRow, wordmarkAnimatedStyle]}>
          <Text style={[styles.stitchText, { color: stitchColor }]}>Stitch</Text>
          <Text style={[styles.flowText, { color: flowColor }]}>Flow</Text>
          <Text style={[styles.tmText, { color: stitchColor }]}>TM</Text>
        </Animated.View>

        <Animated.View style={taglineAnimatedStyle}>
          <Text style={[styles.taglineText, { color: taglineColor }]}>
            PRODUCTION INTELLIGENCE
          </Text>
        </Animated.View>

        <Animated.View style={[styles.loaderWrapper, loaderAnimatedStyle]}>
          <BrandLoadingIndicator
            variant="bar"
            width={96}
            height={3}
            trackColor={tokens.surfaceSecondary}
            indicatorColor={tokens.brand}
          />
          <Text style={[styles.statusText, { color: taglineColor }]}>
            {t('loading')}
          </Text>
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
    alignItems: 'flex-start',
    marginTop: 14,
  },
  stitchText: {
    fontSize: 34,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: -1.0,
    fontFamily: 'sans-serif-bold',
  },
  flowText: {
    fontSize: 34,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: -1.0,
    fontFamily: 'sans-serif-bold',
  },
  tmText: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 3,
    marginTop: 4,
  },
  taglineText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.4,
    marginTop: 6,
    textTransform: 'uppercase',
  },
  loaderWrapper: {
    marginTop: 32,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 11,
    marginTop: 10,
    fontWeight: '500',
  },
});

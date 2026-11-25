import React, { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { AppCard } from './AppCard';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { motion } from '../tokens/motion';
import { Layers } from 'lucide-react-native';

export interface ProductionOutputCardProps {
  actualQty: number;
  targetQty: number;
  unit?: string;
  title?: string;
  subtitle?: string;
  pacePerHour?: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 74;
const RING_STROKE = 6.5;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function ProductionOutputCard({
  actualQty,
  targetQty,
  unit = 'pcs',
  title = 'Production Output',
  subtitle,
  pacePerHour,
}: ProductionOutputCardProps) {
  const { tokens } = useThemeStore();
  const reducedMotion = useReducedMotion();
  const progress = targetQty > 0 ? Math.min(actualQty / targetQty, 1) : 0;
  const pct = Math.round(progress * 100);
  const remainingQty = Math.max(0, targetQty - actualQty);

  const animatedProgress = useSharedValue(reducedMotion ? progress : 0);

  useEffect(() => {
    if (reducedMotion) {
      animatedProgress.value = progress;
    } else {
      animatedProgress.value = withTiming(progress, motion.timing.chartReveal);
    }
  }, [progress, reducedMotion]);

  const animatedCircleProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - animatedProgress.value),
  }));

  // Corporate Blue hero uses crisp white text and Production Green / soft blue accents
  const heroText = '#FFFFFF';
  const heroMuted = 'rgba(255, 255, 255, 0.76)';
  const heroDivider = 'rgba(255, 255, 255, 0.16)';
  const trackBg = 'rgba(255, 255, 255, 0.18)';
  const progressAccent = '#34C765';

  return (
    <AppCard variant="forest" padding={spacing[5]}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.titleWithIcon}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.14)' }]}>
            <Layers size={18} color="#FFFFFF" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="label" bold style={{ color: heroText, letterSpacing: 0.2 }}>
              {title}
            </AppText>
            {subtitle && (
              <AppText variant="caption" style={{ color: heroMuted }}>
                {subtitle}
              </AppText>
            )}
          </View>
        </View>
      </View>

      {/* Main Asymmetric Hero Row: Large Editorial Number + Precision SVG Ring */}
      <View style={styles.heroBody}>
        <View style={styles.numberBlock}>
          <View style={styles.numberRow}>
            <AppText style={[styles.heroActual, { color: heroText }]}>
              {actualQty.toLocaleString()}
            </AppText>
            <AppText style={[styles.heroTarget, { color: heroMuted }]}>
              / {targetQty.toLocaleString()} {unit}
            </AppText>
          </View>
        </View>

        <View
          style={styles.ringWrap}
          accessible
          accessibilityLabel={`${pct}% of target`}
        >
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={trackBg}
              strokeWidth={RING_STROKE}
              fill="none"
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_RADIUS}
              stroke={progressAccent}
              strokeWidth={RING_STROKE}
              strokeDasharray={RING_CIRCUMFERENCE}
              animatedProps={animatedCircleProps}
              strokeLinecap="round"
              rotation="-90"
              origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              fill="none"
            />
          </Svg>
          <View style={styles.ringCenter}>
            <AppText
              style={{
                color: heroText,
                fontSize: 16,
                lineHeight: 20,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
                includeFontPadding: false,
              }}
            >
              {pct}%
            </AppText>
          </View>
        </View>
      </View>

      {/* Precision Progress Track */}
      <View style={[styles.progressTrack, { backgroundColor: trackBg }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${pct}%`,
              backgroundColor: progressAccent,
            },
          ]}
        />
      </View>

      {/* Footer Strip: Remaining + Current Pace */}
      <View style={[styles.footerStrip, { borderTopColor: heroDivider }]}>
        <View style={styles.footerStat}>
          <AppText variant="caption" style={{ color: heroMuted }}>
            Remaining:
          </AppText>
          <AppText
            variant="caption"
            bold
            style={{ color: heroText, marginLeft: spacing[1], fontVariant: ['tabular-nums'] }}
          >
            {remainingQty.toLocaleString()} {unit}
          </AppText>
        </View>

        {pacePerHour !== undefined && (
          <View style={styles.footerStat}>
            <AppText variant="caption" style={{ color: heroMuted }}>
              Pace:
            </AppText>
            <AppText
              variant="caption"
              bold
              style={{
                color: progressAccent,
                marginLeft: spacing[1],
                fontVariant: ['tabular-nums'],
              }}
            >
              {pacePerHour} {unit}/hr
            </AppText>
          </View>
        )}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2.5],
    flex: 1,
  },
  iconContainer: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3.5],
    gap: spacing[3],
  },
  numberBlock: {
    flex: 1,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  heroActual: {
    fontSize: 48,
    lineHeight: 58,
    fontWeight: '800',
    fontFamily: Platform.select({ android: 'sans-serif-black', default: 'System' }),
    letterSpacing: -0.5,
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },
  heroTarget: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    fontFamily: Platform.select({ android: 'sans-serif-medium', default: 'System' }),
    marginLeft: spacing[1.5],
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 7,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.full,
  },
  footerStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[3.5],
    paddingTop: spacing[3],
    borderTopWidth: 1,
  },
  footerStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

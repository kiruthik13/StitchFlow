import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { motion } from '../tokens/motion';

export interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: 'none' | 'light' | 'medium' | 'selection';
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Tactile UI-thread press container for Atelier Industrial controls.
 * Respects OS reduced-motion preferences and provides optional haptics.
 */
export function PressableScale({
  children,
  style,
  scaleTo = 0.975,
  haptic = 'none',
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  ...props
}: PressableScaleProps) {
  const pressed = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    return {
      transform: [
        {
          scale: withTiming(pressed.value ? scaleTo : 1, motion.timing.press),
        },
      ],
    };
  });

  const triggerHaptic = () => {
    if (haptic === 'none') return;
    if (haptic === 'light') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else if (haptic === 'medium') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    } else if (haptic === 'selection') {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(e) => {
        pressed.value = 1;
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = 0;
        onPressOut?.(e);
      }}
      onPress={(e) => {
        triggerHaptic();
        onPress?.(e);
      }}
      style={[animatedStyle, style]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

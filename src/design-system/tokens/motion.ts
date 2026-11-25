import { Easing, WithSpringConfig, WithTimingConfig } from 'react-native-reanimated';

/**
 * StitchFlow — Atelier Industrial Motion System
 *
 * Timings communicate interaction, hierarchy, state, and progress
 * without delaying critical factory-floor operations.
 */
export const motion = {
  duration: {
    press: 100,        // 80-120ms: tactile button / card press feedback
    selection: 160,    // 150-180ms: tab / chip / filter selection
    expansion: 220,    // 200-250ms: accordion / ticket / sheet expansion
    transition: 260,   // 220-300ms: screen / phase transitions
    chartReveal: 420,  // 350-500ms: progress ring / bar / chart reveal
  },
  easing: {
    standard: Easing.bezier(0.2, 0, 0, 1),
    decelerate: Easing.bezier(0, 0, 0.2, 1),
    accelerate: Easing.bezier(0.4, 0, 1, 1),
  },
  spring: {
    tactile: {
      damping: 20,
      stiffness: 380,
      mass: 0.7,
    } satisfies WithSpringConfig,
    gentle: {
      damping: 22,
      stiffness: 220,
      mass: 0.9,
    } satisfies WithSpringConfig,
  },
  timing: {
    press: {
      duration: 100,
      easing: Easing.bezier(0.2, 0, 0, 1),
    } satisfies WithTimingConfig,
    selection: {
      duration: 160,
      easing: Easing.bezier(0.2, 0, 0, 1),
    } satisfies WithTimingConfig,
    chartReveal: {
      duration: 420,
      easing: Easing.bezier(0, 0, 0.2, 1),
    } satisfies WithTimingConfig,
  },
} as const;

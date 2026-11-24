import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import { AppText } from './AppText';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { Scissors, Check, ShieldCheck, Package, Cpu } from 'lucide-react-native';

export type StageState = 'completed' | 'in_progress' | 'pending' | 'on_hold' | 'rework' | 'rejected';

export interface StageItem {
  id: string;
  name: string;
  state: StageState;
}

export interface ProductionStageStepperProps {
  stages?: StageItem[];
  currentStageId?: string;
}

const DEFAULT_STAGES: StageItem[] = [
  { id: 'cutting', name: 'Cutting', state: 'completed' },
  { id: 'sewing', name: 'Sewing', state: 'in_progress' },
  { id: 'qc', name: 'QC Gate', state: 'pending' },
  { id: 'packing', name: 'Packing', state: 'pending' },
];

export function ProductionStageStepper({
  stages = DEFAULT_STAGES,
}: ProductionStageStepperProps) {
  const { tokens, mode } = useThemeStore();

  const getStateColor = (state: StageState) => {
    switch (state) {
      case 'completed':
        return tokens.success;
      case 'in_progress':
        return tokens.signatureLime;
      case 'on_hold':
        return tokens.warning;
      case 'rework':
      case 'rejected':
        return tokens.danger;
      default:
        return tokens.textDisabled;
    }
  };

  const getStageIcon = (id: string, state: StageState) => {
    const color = state === 'in_progress' ? '#0D2B20' : state === 'completed' ? '#FFFFFF' : tokens.textDisabled;
    const size = 14;

    if (state === 'completed') {
      return <Check size={size} color="#FFFFFF" strokeWidth={3} />;
    }

    switch (id) {
      case 'cutting':
        return <Scissors size={size} color={color} strokeWidth={2.2} />;
      case 'sewing':
        return <Cpu size={size} color={color} strokeWidth={2.2} />;
      case 'qc':
        return <ShieldCheck size={size} color={color} strokeWidth={2.2} />;
      case 'packing':
        return <Package size={size} color={color} strokeWidth={2.2} />;
      default:
        return <Cpu size={size} color={color} strokeWidth={2.2} />;
    }
  };

  return (
    <View style={styles.container}>
      {stages.map((st, idx) => {
        const isCompleted = st.state === 'completed';
        const isInProgress = st.state === 'in_progress';
        const color = getStateColor(st.state);

        return (
          <React.Fragment key={st.id}>
            <View style={styles.stageItem}>
              <View
                style={[
                  styles.circle,
                  {
                    backgroundColor: isInProgress
                      ? tokens.signatureLime
                      : isCompleted
                      ? tokens.success
                      : tokens.surfaceSecondary,
                    borderColor: isInProgress ? tokens.borderStrong : 'transparent',
                    borderWidth: isInProgress ? 1.5 : 0,
                  },
                ]}
              >
                {getStageIcon(st.id, st.state)}
              </View>
              <AppText
                variant="caption"
                bold={isInProgress}
                style={[
                  styles.stageLabel,
                  {
                    color: isInProgress
                      ? tokens.textPrimary
                      : isCompleted
                      ? tokens.success
                      : tokens.textSecondary,
                  },
                ]}
              >
                {st.name}
              </AppText>
            </View>

            {idx < stages.length - 1 && (
              <View
                style={[
                  styles.line,
                  {
                    backgroundColor: isCompleted ? tokens.success : tokens.border,
                  },
                ]}
              />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
  },
  stageItem: {
    alignItems: 'center',
    width: 62,
  },
  circle: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[1],
  },
  line: {
    flex: 1,
    height: 2,
    marginBottom: spacing[4],
  },
  stageLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
});

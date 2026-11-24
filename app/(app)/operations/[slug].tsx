import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { CuttingEntryView } from '../../../src/features/operations/CuttingEntryView';
import { SewingEntryView } from '../../../src/features/operations/SewingEntryView';
import { KajaIroningEntryView } from '../../../src/features/operations/KajaIroningEntryView';
import { ReportIssueView } from '../../../src/features/operations/ReportIssueView';
import { WorkAssignmentView } from '../../../src/features/operations/WorkAssignmentView';
import { TailorMappingView } from '../../../src/features/operations/TailorMappingView';
import { SamMonitorView } from '../../../src/features/operations/SamMonitorView';
import { StockMovementView } from '../../../src/features/operations/StockMovementView';

const TITLES: Record<string, string> = {
  'cutting-entry': 'Cutting Entry',
  'sewing-entry': 'Sewing Out Entry',
  'kaja-entry': 'Kaja / Button Entry',
  'ironing-entry': 'Ironing & Thread Trimming',
  'completed-entry': 'Completed Quantity Entry',
  'report-issue': 'Report Production Issue',
  'work-assignment': 'Work Assignment',
  'tailor-mapping': 'Tailor Mapping',
  'sam-monitor': 'SAM Monitoring',
  'input-in': 'Goods Inward (Input In)',
  'input-out': 'Issue to Production (Input Out)',
  'output-in': 'Receive Store (Output In)',
  'output-out': 'Dispatch Freight (Output Out)',
  'tag-reprint': 'Tag Reprint Request',
};

export default function OperationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { tokens } = useThemeStore();

  const title = (slug && TITLES[slug]) ? TITLES[slug] : 'Operation Details';

  const renderContent = () => {
    switch (slug) {
      case 'cutting-entry':
        return <CuttingEntryView />;
      case 'sewing-entry':
        return <SewingEntryView />;
      case 'kaja-entry':
        return <KajaIroningEntryView type="kaja" />;
      case 'ironing-entry':
        return <KajaIroningEntryView type="ironing" />;
      case 'completed-entry':
        return <SewingEntryView />;
      case 'report-issue':
        return <ReportIssueView />;
      case 'work-assignment':
        return <WorkAssignmentView />;
      case 'tailor-mapping':
        return <TailorMappingView />;
      case 'sam-monitor':
        return <SamMonitorView />;
      case 'input-in':
        return <StockMovementView mode="input-in" />;
      case 'input-out':
        return <StockMovementView mode="input-out" />;
      case 'output-in':
        return <StockMovementView mode="output-in" />;
      case 'output-out':
        return <StockMovementView mode="output-out" />;
      default:
        return <CuttingEntryView />;
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader title={title} showBack onBack={() => router.back()} />
      <View style={styles.flex}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../../src/store/themeStore';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { CuttingEntryView } from '../../../src/features/operations/CuttingEntryView';
import { SewingEntryView } from '../../../src/features/operations/SewingEntryView';
import { KajaIroningEntryView } from '../../../src/features/operations/KajaIroningEntryView';
import { ReportIssueView } from '../../../src/features/operations/ReportIssueView';
import { WorkAssignmentView } from '../../../src/features/operations/WorkAssignmentView';
import { TailorMappingView } from '../../../src/features/operations/TailorMappingView';
import { SamMonitorView } from '../../../src/features/operations/SamMonitorView';
import { CutStockView } from '../../../src/features/operations/CutStockView';
import { useAuthStore } from '../../../src/store/authStore';
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
  const { t } = useTranslation(['production', 'inventory', 'common']);

  const getTitle = (s?: string) => {
    switch (s) {
      case 'cutting-entry': return t('production:cuttingEntry');
      case 'sewing-entry': return t('production:sewingEntry');
      case 'kaja-entry': return t('production:kajaEntry');
      case 'ironing-entry': return t('production:ironingEntry');
      case 'completed-entry': return t('production:completedEntry');
      case 'report-issue': return t('production:reportMachineStoppage');
      case 'work-assignment': return t('production:workAssignment');
      case 'tailor-mapping': return t('production:tailorMapping');
      case 'sam-monitor': return t('production:samMonitor');
      case 'input-in': return t('inventory:inputIn');
      case 'input-out': return t('inventory:inputOut');
      case 'output-in': return t('inventory:outputIn');
      case 'output-out': return t('inventory:outputOut');
      case 'tag-reprint': return t('production:tagReprints');
      default: return (slug && TITLES[slug]) ? TITLES[slug] : t('common:details');
    }
  };

  const isDemoMode = useAuthStore(state => state.isDemoMode);
  const title = getTitle(slug);

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
        return isDemoMode ? <StockMovementView mode="output-in" /> : <CutStockView mode="output-in" />;
      case 'output-out':
        return isDemoMode ? <StockMovementView mode="output-out" /> : <CutStockView mode="output-out" />;
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

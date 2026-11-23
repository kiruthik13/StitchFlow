import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../../../src/store/themeStore';
import { useAuthStore } from '../../../src/store/authStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { BarcodeResultCard } from '../../../src/design-system/components/BarcodeResultCard';
import { QuantityStepper } from '../../../src/design-system/components/QuantityStepper';
import { ConfirmSheet } from '../../../src/design-system/components/ConfirmSheet';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { radii } from '../../../src/design-system/tokens/radii';
import { typography } from '../../../src/design-system/tokens/typography';
import { getBundleByCode, BUNDLES } from '../../../src/fixtures/mockData';
import { ScanResult, Bundle } from '../../../src/core/types';

type ScanPhase = 'idle' | 'resolved' | 'quantity-entry' | 'confirmed';

const DEMO_CODES = ['BND-00521', 'BND-00522', 'BND-00523', 'BND-00524', 'BND-00525'];

export default function ScanTabScreen() {
  const { tokens } = useThemeStore();
  const { user } = useAuthStore();
  const { addScan, submitProductionQty, recentScans } = useDemoStore();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [manualCode, setManualCode] = useState('');
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const resolveCode = (code: string) => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    const isDuplicate = recentScans.includes(trimmed);
    const bundle = getBundleByCode(trimmed) ?? BUNDLES.find((b) => b.bundleCode.includes(trimmed.replace('BND-', '')));

    const result: ScanResult = {
      code: trimmed,
      type: 'QR_CODE',
      timestamp: new Date().toISOString(),
      resolvedBundle: bundle,
      status: isDuplicate ? 'duplicate' : bundle ? 'success' : 'not-found',
    };

    setScanResult(result);
    if (bundle) {
      setQuantity(bundle.quantity);
    }
    addScan(trimmed);
    setPhase('resolved');
  };

  const handleDemoScan = (code: string) => {
    setManualCode(code);
    resolveCode(code);
  };

  const handleManualLookup = () => resolveCode(manualCode);

  const handleConfirmQuantity = () => {
    if (!scanResult?.resolvedBundle) return;
    const success = submitProductionQty(scanResult.resolvedBundle.id, quantity, scanResult.resolvedBundle.currentStage);
    setShowConfirm(false);
    if (success) setPhase('confirmed');
  };

  const handleReset = () => {
    setPhase('idle');
    setScanResult(null);
    setManualCode('');
    setQuantity(0);
  };

  const getActionLabel = (): string => {
    const role = user?.role;
    if (role === 'operator') return 'Enter Quantity';
    if (role === 'qc-inspector') return 'Start Inspection';
    if (role === 'packing-staff') return 'Pack Bundle';
    if (role === 'store-dispatch') return 'Record Movement';
    return 'View Details';
  };

  const handlePrimaryAction = () => {
    const role = user?.role;
    if (role === 'operator') {
      setPhase('quantity-entry');
    } else if (role === 'qc-inspector' && scanResult?.resolvedBundle) {
      router.push(`/(app)/inspections/${scanResult.resolvedBundle.id}`);
    } else if (role === 'packing-staff' && scanResult?.resolvedBundle) {
      setShowConfirm(true);
    } else if (scanResult?.resolvedBundle) {
      router.push(`/(app)/bundles/${scanResult.resolvedBundle.id}`);
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: tokens.surface, borderBottomColor: tokens.border, paddingTop: insets.top + spacing[3] }]}>
        <AppText variant="h3" bold style={{ color: tokens.textPrimary }}>Scanner</AppText>
        <View style={[styles.netBadge, { backgroundColor: tokens.warningLight }]}>
          <AppText variant="caption" style={{ color: tokens.warning }}>Demo — Offline</AppText>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]} showsVerticalScrollIndicator={false}>

        {/* Camera viewport placeholder */}
        <View style={[styles.viewport, { borderColor: tokens.border, backgroundColor: tokens.surfaceSecondary }]}>
          {/* Scan brackets */}
          <View style={[styles.bracketTL, { borderColor: tokens.brand }]} />
          <View style={[styles.bracketTR, { borderColor: tokens.brand }]} />
          <View style={[styles.bracketBL, { borderColor: tokens.brand }]} />
          <View style={[styles.bracketBR, { borderColor: tokens.brand }]} />

          <View style={styles.viewportContent}>
            <AppText style={{ fontSize: 48 }}>📷</AppText>
            <AppText variant="body" color="secondary" center style={{ marginTop: spacing[2] }}>
              Camera scanner
            </AppText>
            <AppText variant="caption" color="secondary" center>
              Point camera at barcode or QR code
            </AppText>
            <TouchableOpacity
              onPress={() => setTorchOn(!torchOn)}
              style={[styles.torchBtn, { backgroundColor: torchOn ? tokens.warning : tokens.surface, borderColor: tokens.border }]}
            >
              <AppText style={{ fontSize: 16 }}>🔦</AppText>
              <AppText variant="caption" style={{ color: torchOn ? tokens.warning : tokens.textSecondary, marginLeft: 4 }}>
                {torchOn ? 'ON' : 'OFF'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Demo scan hint chips */}
        <AppText variant="caption" color="secondary" style={{ marginBottom: spacing[1.5] }}>
          Demo: Tap to scan a bundle code
        </AppText>
        <View style={styles.hintRow}>
          {DEMO_CODES.map((code) => (
            <TouchableOpacity
              key={code}
              onPress={() => handleDemoScan(code)}
              style={[styles.hintChip, { backgroundColor: tokens.brandLight, borderColor: tokens.brand }]}
            >
              <AppText variant="codeSmall" mono style={{ color: tokens.brand }}>{code}</AppText>
            </TouchableOpacity>
          ))}
        </View>

        {/* Manual input */}
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppText variant="label" bold style={{ marginBottom: spacing[2] }}>Manual Barcode Entry</AppText>
          <View style={[styles.inputRow, { borderColor: phase === 'idle' ? tokens.border : tokens.brand, backgroundColor: tokens.surface }]}>
            <TextInput
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="e.g. BND-00521"
              placeholderTextColor={tokens.textDisabled}
              autoCapitalize="characters"
              style={[styles.textInput, { color: tokens.textPrimary, fontFamily: typography.fontFamily.mono, fontSize: typography.fontSize.base }]}
              onSubmitEditing={handleManualLookup}
              returnKeyType="search"
            />
            <TouchableOpacity
              onPress={handleManualLookup}
              style={[styles.lookupBtn, { backgroundColor: tokens.brand }]}
            >
              <AppText variant="label" color="inverse" bold>Look up</AppText>
            </TouchableOpacity>
          </View>
        </AppCard>

        {/* Scan result */}
        {scanResult && phase !== 'idle' && (
          <View style={{ marginBottom: spacing[3] }}>
            {scanResult.status === 'duplicate' && (
              <View style={[styles.warningBox, { backgroundColor: tokens.warningLight, borderColor: tokens.warning }]}>
                <AppText variant="label" bold style={{ color: tokens.warning }}>⚠ Duplicate Scan</AppText>
                <AppText variant="caption" color="secondary">This code was already scanned in this session.</AppText>
              </View>
            )}
            <BarcodeResultCard result={scanResult} />
          </View>
        )}

        {/* Bundle details + action */}
        {scanResult?.resolvedBundle && phase === 'resolved' && (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <AppText variant="h4" bold style={{ marginBottom: spacing[3] }}>Bundle Details</AppText>
            <BundleDetail bundle={scanResult.resolvedBundle} tokens={tokens} />
            <AppButton
              title={getActionLabel()}
              fullWidth
              size="lg"
              style={{ marginTop: spacing[4] }}
              onPress={handlePrimaryAction}
            />
          </AppCard>
        )}

        {/* Quantity entry for operator */}
        {phase === 'quantity-entry' && scanResult?.resolvedBundle && (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <AppText variant="h4" bold style={{ marginBottom: spacing[1] }}>Enter Completed Quantity</AppText>
            <AppText variant="caption" color="secondary" style={{ marginBottom: spacing[4] }}>
              Bundle: {scanResult.resolvedBundle.bundleCode} · Max: {scanResult.resolvedBundle.quantity} pcs
            </AppText>
            <View style={{ alignItems: 'center', marginBottom: spacing[4] }}>
              <QuantityStepper
                value={quantity}
                onChange={setQuantity}
                min={0}
                max={scanResult.resolvedBundle.quantity}
              />
            </View>
            <AppButton
              title={`Confirm ${quantity} pcs`}
              fullWidth
              size="lg"
              onPress={() => setShowConfirm(true)}
              disabled={quantity === 0}
            />
          </AppCard>
        )}

        {/* Success state */}
        {phase === 'confirmed' && (
          <AppCard padding={spacing[5]} style={{ marginBottom: spacing[3], alignItems: 'center' }}>
            <AppText style={{ fontSize: 48, marginBottom: spacing[2] }}>✅</AppText>
            <AppText variant="h3" bold center style={{ marginBottom: spacing[1] }}>Submitted!</AppText>
            <AppText variant="body" color="secondary" center style={{ marginBottom: spacing[4] }}>
              {quantity} pcs recorded for {scanResult?.code}
            </AppText>
            <AppText variant="caption" style={{ color: tokens.warning, marginBottom: spacing[4] }}>
              Demo mode — not saved to server
            </AppText>
            <AppButton title="Scan Next Bundle" fullWidth onPress={handleReset} />
          </AppCard>
        )}

        {/* Scan history */}
        {recentScans.length > 0 && (
          <AppCard padding={spacing[3]}>
            <AppText variant="label" bold style={{ marginBottom: spacing[2] }}>Recent Scans ({recentScans.length})</AppText>
            {recentScans.slice(0, 5).map((code, i) => (
              <View key={i} style={[styles.historyRow, { borderBottomColor: tokens.border }]}>
                <AppText variant="codeSmall" mono style={{ color: tokens.textPrimary }}>{code}</AppText>
                <AppText variant="caption" color="secondary">Session</AppText>
              </View>
            ))}
          </AppCard>
        )}

      </ScrollView>

      {/* Confirm sheet */}
      <ConfirmSheet
        visible={showConfirm}
        title="Confirm Action"
        message={
          user?.role === 'operator'
            ? `Record ${quantity} pcs for bundle ${scanResult?.code}? This will update the bundle status.`
            : `Pack bundle ${scanResult?.code}? Confirm QC-released quantity only.`
        }
        confirmLabel="Yes, Confirm"
        cancelLabel="Cancel"
        onConfirm={handleConfirmQuantity}
        onCancel={() => setShowConfirm(false)}
      />
    </View>
  );
}

function BundleDetail({ bundle, tokens }: { bundle: Bundle; tokens: any }) {
  const rows = [
    ['Bundle', bundle.bundleCode],
    ['Job', bundle.jobCode],
    ['Style', bundle.styleName],
    ['Color', bundle.color],
    ['Size', bundle.size],
    ['Qty', String(bundle.quantity)],
    ['Stage', bundle.currentStage],
    ['Operator', bundle.operatorName ?? '—'],
  ];
  return (
    <View>
      {rows.map(([label, value]) => (
        <View key={label} style={[styles.detailRow, { borderBottomColor: tokens.border }]}>
          <AppText variant="caption" color="secondary" style={{ width: 70 }}>{label}</AppText>
          <AppText variant="label" mono style={{ color: tokens.textPrimary }}>{value}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[4], paddingBottom: spacing[3], borderBottomWidth: 1, justifyContent: 'space-between' },
  netBadge: { paddingHorizontal: spacing[2], paddingVertical: spacing[0.5], borderRadius: radii.full },
  scroll: { padding: spacing[4] },
  viewport: {
    width: '100%',
    height: 260,
    borderWidth: 1,
    borderRadius: radii.xl,
    marginBottom: spacing[3],
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewportContent: { alignItems: 'center' },
  bracketTL: { position: 'absolute', top: 20, left: 20, width: 32, height: 32, borderTopWidth: 3, borderLeftWidth: 3 },
  bracketTR: { position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderTopWidth: 3, borderRightWidth: 3 },
  bracketBL: { position: 'absolute', bottom: 20, left: 20, width: 32, height: 32, borderBottomWidth: 3, borderLeftWidth: 3 },
  bracketBR: { position: 'absolute', bottom: 20, right: 20, width: 32, height: 32, borderBottomWidth: 3, borderRightWidth: 3 },
  torchBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radii.full, borderWidth: 1, marginTop: spacing[3] },
  hintRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[1.5], marginBottom: spacing[3] },
  hintChip: { paddingHorizontal: spacing[2], paddingVertical: spacing[1], borderRadius: radii.full, borderWidth: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: radii.md, overflow: 'hidden' },
  textInput: { flex: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  lookupBtn: { paddingHorizontal: spacing[3], paddingVertical: spacing[2.5] },
  warningBox: { borderWidth: 1, borderRadius: 8, padding: spacing[3], marginBottom: spacing[2] },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing[1.5], borderBottomWidth: 1 },
  detailRow: { flexDirection: 'row', paddingVertical: spacing[1.5], borderBottomWidth: 1 },
});

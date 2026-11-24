import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import {
  Camera,
  Flashlight,
  ScanLine,
  CheckCircle2,
  Barcode as BarcodeIcon,
  Search,
  RotateCcw,
  AlertTriangle,
  History,
  Tag,
  ArrowRight,
  ShieldCheck,
  Package,
} from 'lucide-react-native';
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
  const { t } = useTranslation(['common', 'production', 'quality', 'inventory', 'packing']);

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
    const bundle =
      getBundleByCode(trimmed) ??
      BUNDLES.find((b) => b.bundleCode.includes(trimmed.replace('BND-', '')));

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
    const success = submitProductionQty(
      scanResult.resolvedBundle.id,
      quantity,
      scanResult.resolvedBundle.currentStage
    );
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
    if (role === 'operator') return t('production:enterOutputQty');
    if (role === 'qc-inspector') return t('quality:startQualityInspection');
    if (role === 'packing-staff') return t('packing:packVerifiedBundle');
    if (role === 'store-dispatch') return t('inventory:recordDispatchMovement');
    return t('common:viewBundleDetails');
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
      <View
        style={[
          styles.header,
          {
            backgroundColor: tokens.surface,
            borderBottomColor: tokens.border,
            paddingTop: insets.top + spacing[3],
          },
        ]}
      >
        <View style={styles.headerRow}>
          <View>
            <AppText variant="h3" bold style={{ color: tokens.textPrimary }}>
              {t('common:scanBarcode')}
            </AppText>
            <AppText variant="caption" color="secondary">
              Optical QR / 1D & HID Scanner
            </AppText>
          </View>
          <StatusBadge label={t('common:demoModeBadge')} variant="warning" size="sm" />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing[8] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Optical Viewport / Industrial HUD */}
        <View
          style={[
            styles.viewport,
            {
              borderColor: tokens.border,
              backgroundColor: tokens.surfaceSecondary,
            },
          ]}
        >
          {/* Laser Corner Reticles */}
          <View style={[styles.bracketTL, { borderColor: tokens.brand }]} />
          <View style={[styles.bracketTR, { borderColor: tokens.brand }]} />
          <View style={[styles.bracketBL, { borderColor: tokens.brand }]} />
          <View style={[styles.bracketBR, { borderColor: tokens.brand }]} />

          {/* Central Target Reticle */}
          <View style={styles.viewportContent}>
            <View style={[styles.iconAura, { backgroundColor: tokens.brandLight }]}>
              <ScanLine size={44} color={tokens.brand} strokeWidth={1.75} />
            </View>

            <AppText variant="label" bold center style={{ color: tokens.textPrimary, marginTop: spacing[3] }}>
              {t('common:scanBarcode')}
            </AppText>
            <AppText variant="caption" color="secondary" center style={{ marginTop: 2, paddingHorizontal: spacing[4] }}>
              QR codes and Code-128 industrial tags are decoded instantly.
            </AppText>

            {/* Torch Control Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setTorchOn(!torchOn)}
              style={[
                styles.torchBtn,
                {
                  backgroundColor: torchOn ? tokens.warning : tokens.surface,
                  borderColor: torchOn ? tokens.warning : tokens.border,
                },
              ]}
            >
              <Flashlight
                size={16}
                color={torchOn ? tokens.textInverse : tokens.textSecondary}
                strokeWidth={2}
              />
              <AppText
                variant="caption"
                bold
                style={{
                  color: torchOn ? tokens.textInverse : tokens.textSecondary,
                  marginLeft: spacing[1.5],
                }}
              >
                TORCH: {torchOn ? 'ON' : 'OFF'}
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Demo Scan Chips */}
        <View style={styles.demoSection}>
          <View style={styles.demoSectionHeader}>
            <Tag size={13} color={tokens.textSecondary} />
            <AppText
              variant="caption"
              color="secondary"
              uppercase
              bold
              style={{ marginLeft: spacing[1.5], letterSpacing: 0.6 }}
            >
              Quick Test Bundles (Tap to Simulate Scan)
            </AppText>
          </View>
          <View style={styles.hintRow}>
            {DEMO_CODES.map((code) => (
              <TouchableOpacity
                key={code}
                onPress={() => handleDemoScan(code)}
                activeOpacity={0.7}
                style={[
                  styles.hintChip,
                  {
                    backgroundColor: tokens.surfaceSecondary,
                    borderColor: tokens.border,
                  },
                ]}
              >
                <BarcodeIcon size={12} color={tokens.brand} />
                <AppText variant="codeSmall" mono bold style={{ color: tokens.textPrimary, marginLeft: 4 }}>
                  {code}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Manual Input Card */}
        <AppCard padding={spacing[3.5]} style={{ marginBottom: spacing[3] }}>
          <AppText variant="caption" color="secondary" uppercase bold style={{ letterSpacing: 0.6, marginBottom: spacing[2] }}>
            Manual Barcode Entry
          </AppText>
          <View
            style={[
              styles.inputRow,
              {
                borderColor: tokens.border,
                backgroundColor: tokens.surfaceSecondary,
              },
            ]}
          >
            <View style={{ paddingLeft: spacing[3] }}>
              <Search size={18} color={tokens.textSecondary} />
            </View>
            <TextInput
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="e.g. BND-00521"
              placeholderTextColor={tokens.textDisabled}
              autoCapitalize="characters"
              style={[
                styles.textInput,
                {
                  color: tokens.textPrimary,
                  fontFamily: typography.fontFamily.mono,
                  fontSize: typography.fontSize.base,
                },
              ]}
              onSubmitEditing={handleManualLookup}
              returnKeyType="search"
            />
            <TouchableOpacity
              onPress={handleManualLookup}
              activeOpacity={0.8}
              style={[styles.lookupBtn, { backgroundColor: tokens.brand }]}
            >
              <AppText variant="label" color="inverse" bold>
                {t('common:search')}
              </AppText>
            </TouchableOpacity>
          </View>
        </AppCard>

        {/* Scan Result Notice */}
        {scanResult && phase !== 'idle' && (
          <View style={{ marginBottom: spacing[3] }}>
            {scanResult.status === 'duplicate' && (
              <View
                style={[
                  styles.warningBox,
                  {
                    backgroundColor: tokens.warningLight,
                    borderColor: tokens.warning,
                  },
                ]}
              >
                <AlertTriangle size={18} color={tokens.warning} />
                <View style={{ flex: 1, marginLeft: spacing[2.5] }}>
                  <AppText variant="label" bold style={{ color: tokens.warning }}>
                    Duplicate Scan Warning
                  </AppText>
                  <AppText variant="caption" color="secondary">
                    This barcode was already registered during this active shift session.
                  </AppText>
                </View>
              </View>
            )}
            <BarcodeResultCard result={scanResult} />
          </View>
        )}

        {/* Bundle Details & Primary Action */}
        {scanResult?.resolvedBundle && phase === 'resolved' && (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <View style={styles.cardHeaderRow}>
              <View>
                <AppText variant="h4" bold style={{ color: tokens.textPrimary }}>
                  Bundle Specification
                </AppText>
                <AppText variant="caption" color="secondary">
                  Ready for station processing
                </AppText>
              </View>
              <StatusBadge
                label={scanResult.resolvedBundle.currentStage.toUpperCase()}
                variant="brand"
                size="sm"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: tokens.border }]} />

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

        {/* Operator Output Quantity Entry */}
        {phase === 'quantity-entry' && scanResult?.resolvedBundle && (
          <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
            <AppText variant="h4" bold style={{ color: tokens.textPrimary, marginBottom: 2 }}>
              Enter Completed Units
            </AppText>
            <AppText variant="caption" color="secondary" style={{ marginBottom: spacing[4] }}>
              Bundle: {scanResult.resolvedBundle.bundleCode} · Max Batch Size: {scanResult.resolvedBundle.quantity} pcs
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
              title={`Confirm ${quantity} pcs Completed`}
              fullWidth
              size="lg"
              onPress={() => setShowConfirm(true)}
              disabled={quantity === 0}
            />
          </AppCard>
        )}

        {/* Success Confirmation State */}
        {phase === 'confirmed' && (
          <AppCard
            padding={spacing[5]}
            style={[styles.confirmedCard, { marginBottom: spacing[3] }]}
          >
            <View style={[styles.successIconCircle, { backgroundColor: tokens.successLight }]}>
              <CheckCircle2 size={44} color={tokens.success} strokeWidth={2.2} />
            </View>
            <AppText variant="h3" bold center style={{ color: tokens.textPrimary, marginTop: spacing[3] }}>
              Production Recorded
            </AppText>
            <AppText variant="body" color="secondary" center style={{ marginTop: 2 }}>
              {quantity} units registered for bundle {scanResult?.code}
            </AppText>
            <View style={[styles.demoStamp, { backgroundColor: tokens.surfaceSecondary }]}>
              <AppText variant="caption" color="secondary" mono>
                SESSION SYNCED · MOCK STORE
              </AppText>
            </View>
            <AppButton
              title={t('production:scanNext')}
              fullWidth
              size="lg"
              style={{ marginTop: spacing[4] }}
              onPress={handleReset}
            />
          </AppCard>
        )}

        {/* Recent Session Scan History */}
        {recentScans.length > 0 && (
          <AppCard padding={spacing[3.5]}>
            <View style={styles.historyHeader}>
              <History size={16} color={tokens.textSecondary} />
              <AppText variant="label" bold style={{ marginLeft: spacing[2], color: tokens.textPrimary }}>
                Session Scan Log ({recentScans.length})
              </AppText>
            </View>
            {recentScans.slice(0, 5).map((code, i) => (
              <View
                key={i}
                style={[
                  styles.historyRow,
                  { borderBottomColor: tokens.border },
                  i === recentScans.slice(0, 5).length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <BarcodeIcon size={14} color={tokens.textSecondary} />
                  <AppText variant="codeSmall" mono bold style={{ color: tokens.textPrimary, marginLeft: spacing[2] }}>
                    {code}
                  </AppText>
                </View>
                <StatusBadge label="VERIFIED" variant="neutral" size="sm" />
              </View>
            ))}
          </AppCard>
        )}
      </ScrollView>

      {/* Confirm Action Sheet */}
      <ConfirmSheet
        visible={showConfirm}
        title="Confirm Floor Update"
        message={
          user?.role === 'operator'
            ? `Submit ${quantity} completed pcs for bundle ${scanResult?.code}? This updates WIP and stage progress.`
            : `Pack bundle ${scanResult?.code}? Confirm carton allocation and QC release compliance.`
        }
        confirmLabel="Confirm Update"
        cancelLabel="Review"
        onConfirm={handleConfirmQuantity}
        onCancel={() => setShowConfirm(false)}
      />
    </View>
  );
}

function BundleDetail({ bundle, tokens }: { bundle: Bundle; tokens: any }) {
  const rows = [
    { label: 'Bundle Code', value: bundle.bundleCode, mono: true },
    { label: 'Job Order', value: bundle.jobCode, mono: true },
    { label: 'Style Name', value: bundle.styleName, mono: false },
    { label: 'Color / Wash', value: bundle.color, mono: false },
    { label: 'Size', value: bundle.size, mono: true },
    { label: 'Batch Qty', value: `${bundle.quantity} pcs`, mono: true },
    { label: 'Current Stage', value: bundle.currentStage, mono: false },
    { label: 'Assigned Operator', value: bundle.operatorName ?? 'Unassigned', mono: false },
  ];

  return (
    <View style={styles.detailContainer}>
      {rows.map((r, i) => (
        <View
          key={r.label}
          style={[
            styles.detailRow,
            { borderBottomColor: tokens.border },
            i === rows.length - 1 && { borderBottomWidth: 0 },
          ]}
        >
          <AppText variant="caption" color="secondary" style={{ width: 110 }}>
            {r.label}
          </AppText>
          <AppText
            variant="label"
            mono={r.mono}
            bold={r.mono}
            style={{ color: tokens.textPrimary, flex: 1, textAlign: 'right' }}
          >
            {r.value}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scroll: {
    padding: spacing[4],
  },
  viewport: {
    width: '100%',
    height: 250,
    borderWidth: 1.5,
    borderRadius: radii.xl,
    marginBottom: spacing[3],
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewportContent: {
    alignItems: 'center',
  },
  iconAura: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bracketTL: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderRadius: 2,
  },
  bracketTR: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 28,
    height: 28,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderRadius: 2,
  },
  bracketBL: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderRadius: 2,
  },
  bracketBR: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 28,
    height: 28,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderRadius: 2,
  },
  torchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.full,
    borderWidth: 1,
    marginTop: spacing[3],
    minHeight: 36,
  },
  demoSection: {
    marginBottom: spacing[3],
  },
  demoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1.5],
  },
  hintRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
  },
  hintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: radii.md,
    borderWidth: 1,
    minHeight: 32,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[2.5],
    minHeight: 48,
  },
  lookupBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2.5],
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  divider: {
    height: 1,
    marginVertical: spacing[3],
  },
  detailContainer: {
    gap: 0,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
  },
  confirmedCard: {
    alignItems: 'center',
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoStamp: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radii.full,
    marginTop: spacing[3],
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[2.5],
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
  },
});

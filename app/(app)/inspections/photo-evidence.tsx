import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, CheckCircle2, RefreshCw } from 'lucide-react-native';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { AppCard } from '../../../src/design-system/components/AppCard';
import { AppHeader } from '../../../src/design-system/components/AppHeader';
import { AppInput } from '../../../src/design-system/components/AppInput';
import { AppText } from '../../../src/design-system/components/AppText';
import { StatusBadge } from '../../../src/design-system/components/StatusBadge';
import { radii } from '../../../src/design-system/tokens/radii';
import { spacing } from '../../../src/design-system/tokens/spacing';
import { ApiError, apiRequest } from '../../../src/services/api/apiClient';
import { useAuthStore } from '../../../src/store/authStore';
import { useDemoStore } from '../../../src/store/demoStore';
import { useThemeStore } from '../../../src/store/themeStore';
import { formatDateTime } from '../../../src/utils/formatters';

interface QualityBundle {
  id: string;
  bundleCode: string;
  jobCode: string;
  size: string;
  color: string;
  quantity: number;
}

interface EvidenceResponse {
  requestId: string;
  photos: { id: string; createdAt: string }[];
}

interface CapturedPhoto {
  uri: string;
  width?: number;
  height?: number;
  capturedAt: string;
}

export default function PhotoEvidenceScreen() {
  const { bundleId: paramBundleId } = useLocalSearchParams<{ bundleId?: string }>();
  const { tokens } = useThemeStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(['quality', 'common', 'errors']);
  const { user, isDemoMode } = useAuthStore();
  const { bundles: demoBundles } = useDemoStore();
  const factoryId = user?.factoryId;
  const queryClient = useQueryClient();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capture, setCapture] = useState<CapturedPhoto | null>(null);
  const [selectedLive, setSelectedLive] = useState<QualityBundle | null>(null);
  const [defectCode, setDefectCode] = useState('D005 - Broken Stitch & Puckering');
  const [notes, setNotes] = useState('');

  useFocusEffect(
    useCallback(() => {
      return () => {
        setTakingPhoto(false);
        setCameraReady(false);
      };
    }, []),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        setTakingPhoto(false);
        setCameraReady(false);
      }
    });
    return () => sub.remove();
  }, []);

  const bundlesQuery = useQuery({
    queryKey: ['photo-evidence-bundles', user?.id, factoryId],
    enabled: !isDemoMode && !!factoryId,
    queryFn: () => apiRequest<QualityBundle[]>(`/quality/bundles?factoryId=${encodeURIComponent(factoryId!)}`),
  });

  const activeBundle: QualityBundle | null = isDemoMode
    ? (demoBundles[0]
        ? {
            id: demoBundles[0].id,
            bundleCode: demoBundles[0].bundleCode,
            jobCode: demoBundles[0].jobCode,
            size: demoBundles[0].size,
            color: demoBundles[0].color,
            quantity: demoBundles[0].quantity,
          }
        : null)
    : selectedLive ??
      bundlesQuery.data?.find((b) => b.id === paramBundleId) ??
      bundlesQuery.data?.[0] ??
      null;

  const evidenceQuery = useQuery({
    queryKey: ['bundle-evidence', user?.id, activeBundle?.id],
    enabled: !isDemoMode && !!activeBundle?.id,
    queryFn: async () => {
      try {
        return await apiRequest<EvidenceResponse>(
          `/quality/bundles/${encodeURIComponent(activeBundle!.id)}/evidence`,
        );
      } catch (err) {
        if (err instanceof ApiError && (err.statusCode === 403 || err.statusCode === 404)) return null;
        throw err;
      }
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (photo: CapturedPhoto) => {
      if (!activeBundle) throw new Error('No bundle selected');
      const requestId = evidenceQuery.data?.requestId;
      if (!requestId) {
        throw new Error('Evidence session not ready. Tap Refresh and try again.');
      }
      const form = new FormData();
      form.append('requestId', requestId);
      form.append('photo', {
        uri: photo.uri,
        name: `qc-evidence-${Date.now()}.jpg`,
        type: 'image/jpeg',
      } as unknown as Blob);
      return apiRequest(`/quality/bundles/${encodeURIComponent(activeBundle.id)}/photos`, {
        method: 'POST',
        body: form,
        timeoutMs: 45000,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bundle-evidence', user?.id, activeBundle?.id] });
      Alert.alert(
        t('quality:photoEvidence'),
        `Photo evidence uploaded for ${activeBundle?.bundleCode ?? 'bundle'}.`,
        [{ text: t('common:confirm'), onPress: () => router.back() }],
      );
    },
    onError: (err: Error) => {
      const isClientErr = err instanceof ApiError && err.statusCode >= 400 && err.statusCode < 500;
      Alert.alert(isClientErr ? t('errors:validationError') : t('errors:serverError'), err.message);
    },
  });

  const handleOpenCamera = async () => {
    const granted = permission?.granted || (await requestPermission()).granted;
    if (!granted) {
      Alert.alert(t('errors:cameraPermissionRequired'));
      return;
    }
    setCameraReady(false);
    setTakingPhoto(true);
  };

  const handleSnap = async () => {
    if (!cameraRef.current || !cameraReady || capturing) return;
    setCapturing(true);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.65 });
      if (picture?.uri) {
        setCapture({
          uri: picture.uri,
          width: picture.width,
          height: picture.height,
          capturedAt: new Date().toISOString(),
        });
        setTakingPhoto(false);
      }
    } catch {
      Alert.alert(t('errors:serverError'), 'Unable to capture photo from camera.');
    } finally {
      setCapturing(false);
    }
  };

  const handleSave = () => {
    if (!capture) return;
    if (isDemoMode) {
      Alert.alert(
        t('quality:photoEvidence'),
        `Captured real photo (${capture.width ?? '—'}x${capture.height ?? '—'}) attached for ${activeBundle?.bundleCode ?? 'bundle'}.`,
        [{ text: t('common:confirm'), onPress: () => router.back() }],
      );
      return;
    }
    uploadMutation.mutate(capture);
  };

  return (
    <View style={[styles.flex, { backgroundColor: tokens.background }]}>
      <AppHeader
        title={t('quality:photoEvidence')}
        subtitle={activeBundle ? `${activeBundle.bundleCode} · ${activeBundle.jobCode}` : undefined}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing[8] }]}>
        {/* Bundle Picker (Live Mode) */}
        {!isDemoMode && bundlesQuery.data && bundlesQuery.data.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing[3] }}>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              {bundlesQuery.data.slice(0, 20).map((b) => {
                const chosen = activeBundle?.id === b.id;
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => {
                      setSelectedLive(b);
                      setCapture(null);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: chosen ? tokens.brand : tokens.surface,
                        borderColor: chosen ? tokens.brand : tokens.border,
                      },
                    ]}
                  >
                    <AppText variant="label" mono bold style={{ color: chosen ? tokens.textInverse : tokens.textPrimary }}>
                      {b.bundleCode}
                    </AppText>
                    <AppText variant="caption" style={{ color: chosen ? tokens.textInverse : tokens.textSecondary }}>
                      {b.jobCode}
                    </AppText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Real-Time Camera / Captured Photo Preview */}
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3], alignItems: 'center' }}>
          {takingPhoto ? (
            <View style={styles.liveCameraWrap}>
              <CameraView
                ref={cameraRef}
                style={styles.liveCamera}
                facing="back"
                onCameraReady={() => setCameraReady(true)}
              />
              <View style={styles.cameraActions}>
                <View style={{ flex: 1 }}>
                  <AppButton
                    title={capturing ? t('common:loading') : 'Capture Photo'}
                    disabled={!cameraReady || capturing}
                    loading={capturing}
                    leftIcon={<Camera size={16} color={tokens.textInverse} />}
                    onPress={() => void handleSnap()}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton
                    title={t('common:cancel')}
                    variant="outline"
                    disabled={capturing}
                    onPress={() => setTakingPhoto(false)}
                  />
                </View>
              </View>
            </View>
          ) : capture ? (
            <View style={{ width: '100%', alignItems: 'center', gap: spacing[2] }}>
              <Image source={{ uri: capture.uri }} style={styles.previewImage} resizeMode="cover" />
              <View style={styles.captureMetaRow}>
                <View style={{ flex: 1 }}>
                  <AppText variant="label" bold>
                    {formatDateTime(capture.capturedAt)}
                  </AppText>
                  <AppText variant="caption" color="secondary" mono>
                    {capture.width && capture.height ? `${capture.width} × ${capture.height} px` : 'JPEG Image'}
                  </AppText>
                </View>
                <StatusBadge label="CAPTURED" variant="success" size="sm" dot />
              </View>
              <View style={{ width: '100%', marginTop: spacing[1] }}>
                <AppButton
                  title="Retake Defect Photo"
                  variant="outline"
                  leftIcon={<RefreshCw size={16} color={tokens.brand} />}
                  onPress={() => void handleOpenCamera()}
                />
              </View>
            </View>
          ) : (
            <View style={{ width: '100%', alignItems: 'center' }}>
              <View style={[styles.cameraBox, { backgroundColor: tokens.surfaceSecondary, borderColor: tokens.border }]}>
                <Camera size={40} color={tokens.brand} strokeWidth={1.8} />
                <AppText variant="body" bold style={{ marginTop: spacing[2] }}>
                  No Photo Attached
                </AppText>
                <AppText variant="caption" color="secondary" center style={{ marginTop: 4 }}>
                  Open the device camera to capture a real-time defect photo for this bundle.
                </AppText>
              </View>
              <View style={{ marginTop: spacing[3], width: '100%' }}>
                <AppButton
                  title="Snap Camera Evidence"
                  variant="outline"
                  leftIcon={<Camera size={16} color={tokens.brand} />}
                  onPress={() => void handleOpenCamera()}
                />
              </View>
            </View>
          )}
        </AppCard>

        {!isDemoMode && !!evidenceQuery.data?.photos.length && (
          <AppCard padding={spacing[3.5]} style={{ marginBottom: spacing[3] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <CheckCircle2 size={16} color={tokens.success} />
              <AppText variant="label" bold>
                Uploaded Photos for {activeBundle?.bundleCode}: {evidenceQuery.data.photos.length}
              </AppText>
            </View>
          </AppCard>
        )}

        {/* Annotation Form */}
        <AppCard padding={spacing[4]} style={{ marginBottom: spacing[3] }}>
          <AppInput label="Defect Code & Category" value={defectCode} onChangeText={setDefectCode} />
          <AppInput
            label="Inspector Defect Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Describe seam defect, location, and corrective note..."
            multiline
          />
        </AppCard>

        <AppButton
          title="Save Evidence to Bundle"
          onPress={handleSave}
          loading={uploadMutation.isPending}
          disabled={!capture || uploadMutation.isPending || (!isDemoMode && !activeBundle)}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { padding: spacing[4] },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radii.md,
    borderWidth: 1,
  },
  cameraBox: {
    width: '100%',
    height: 200,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[3],
  },
  liveCameraWrap: {
    width: '100%',
    gap: spacing[3],
  },
  liveCamera: {
    width: '100%',
    height: 280,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  cameraActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: radii.md,
  },
  captureMetaRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing[1],
  },
});

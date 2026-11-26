import React, { useCallback, useRef, useState } from 'react';
import { Alert, Image, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AppButton } from '../../design-system/components/AppButton';
import { AppInput } from '../../design-system/components/AppInput';
import { AppText } from '../../design-system/components/AppText';
import { spacing } from '../../design-system/tokens/spacing';
import { apiRequest, ApiError } from '../../services/api/apiClient';
import { useAuthStore } from '../../store/authStore';

interface Evidence {
  requestId: string;
  specs: { id: string; point: string; minimumMm: number; maximumMm: number }[];
  measurements: { id: string; specId: string; measuredMm: number; withinTolerance: boolean }[];
  photos: { id: string; createdAt: string }[];
}

export function BundleEvidencePanel({ bundleId }: { bundleId: string }) {
  const { t } = useTranslation(['common', 'errors', 'production']);
  const user = useAuthStore(state => state.user);
  const canWrite = user?.role === 'qc-inspector';
  const cache = useQueryClient();
  const key = ['bundle-evidence', user?.id, bundleId];
  const endpoint = `/quality/bundles/${encodeURIComponent(bundleId)}`;
  const [open, setOpen] = useState(false);
  const [selection, setSelection] = useState<{ specId: string; requestId: string } | null>(null);
  const [measurement, setMeasurement] = useState('');
  const [permission, requestPermission] = useCameraPermissions();
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [capture, setCapture] = useState<{ uri: string; requestId: string } | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const camera = useRef<CameraView>(null);

  useFocusEffect(useCallback(() => () => {
    setTakingPhoto(false);
    setCameraReady(false);
    setImage(null);
  }, []));

  const evidence = useQuery({
    queryKey: key,
    queryFn: async () => {
      try {
        return await apiRequest<Evidence>(`${endpoint}/evidence`);
      } catch (error) {
        if (error instanceof ApiError && (error.statusCode === 403 || error.statusCode === 404)) return null;
        throw error;
      }
    },
    enabled: open && !!user,
  });

  const saveMeasure = useMutation({
    mutationFn: (selected: NonNullable<typeof selection>) =>
      apiRequest(`${endpoint}/measurements`, {
        method: 'POST', body: JSON.stringify({ ...selected, measuredMm: Number(measurement) }),
      }),
    onSuccess: () => {
      setSelection(null);
      setMeasurement('');
      void cache.invalidateQueries({ queryKey: key });
    },
    onError: () => Alert.alert(t('errors:serverError')),
  });

  const startPhoto = async () => {
    if (!(permission?.granted || (await requestPermission()).granted)) {
      Alert.alert(t('errors:cameraPermissionRequired'));
      return;
    }
    setCameraReady(false);
    setTakingPhoto(true);
  };
  const takePhoto = async () => {
    if (!camera.current || !cameraReady || capturing || !evidence.data) return;
    setCapturing(true);
    try {
      const picture = await camera.current.takePictureAsync({ quality: 0.55 });
      if (picture) {
        setCapture({ uri: picture.uri, requestId: evidence.data.requestId });
        setTakingPhoto(false);
      }
    } catch {
      Alert.alert(t('errors:serverError'));
    } finally {
      setCapturing(false);
    }
  };
  const savePhoto = useMutation({
    mutationFn: async (photo: NonNullable<typeof capture>) => {
      const form = new FormData();
      form.append('requestId', photo.requestId);
      form.append('photo', { uri: photo.uri, name: 'evidence.jpg', type: 'image/jpeg' } as unknown as Blob);
      return apiRequest(`${endpoint}/photos`, { method: 'POST', body: form, timeoutMs: 45000 });
    },
    onSuccess: () => {
      setCapture(null);
      void cache.invalidateQueries({ queryKey: key });
    },
    onError: () => Alert.alert(t('errors:serverError')),
  });
  const viewPhoto = useMutation({
    mutationFn: (id: string) => apiRequest<{ url: string }>(`${endpoint}/photos/${encodeURIComponent(id)}`),
    onSuccess: result => setImage(result.url),
    onError: () => Alert.alert(t('errors:serverError')),
  });

  return (
    <View style={{ gap: spacing[2], marginTop: spacing[3] }}>
      <AppButton title={t('production:bundleEvidence')} variant="outline" size="sm"
        onPress={() => {
          setOpen(!open);
          if (open) { setTakingPhoto(false); setImage(null); }
        }} />
      {open && evidence.isError && <AppButton title={t('common:refresh')} onPress={() => void evidence.refetch()} />}
      {open && evidence.data === null && <AppText>{t('errors:unauthorized')}</AppText>}
      {open && evidence.data && <>
        {canWrite && evidence.data.specs.map(spec => (
          <AppButton key={spec.id} title={`${spec.point} · ${spec.minimumMm}–${spec.maximumMm}`}
            variant={selection?.specId === spec.id ? 'primary' : 'outline'} size="sm"
            onPress={() => {
              if (evidence.data) setSelection({ specId: spec.id, requestId: evidence.data.requestId });
            }} />
        ))}
        {selection && <>
          <AppInput label={t('production:measurementValue')} value={measurement} onChangeText={setMeasurement} keyboardType="decimal-pad" />
          <AppButton title={t('common:confirm')} disabled={saveMeasure.isPending || !measurement.trim() || !Number.isFinite(Number(measurement))
            || Number(measurement) < 0}
            onPress={() => saveMeasure.mutate(selection)} />
        </>}
        {evidence.data.measurements.map(item => (
          <AppText key={item.id} variant="bodySmall">
            {evidence.data?.specs.find(spec => spec.id === item.specId)?.point} · {item.measuredMm} · {t(item.withinTolerance
              ? 'production:withinTolerance' : 'production:outsideTolerance')}
          </AppText>
        ))}
        {canWrite && !takingPhoto && !capture && (
          <AppButton title={t('production:captureEvidencePhoto')} variant="outline" onPress={() => void startPhoto()} />
        )}
        {takingPhoto && <>
          <CameraView ref={camera} style={{ height: 220 }} facing="back" onCameraReady={() => setCameraReady(true)} />
          <AppButton title={t('production:captureEvidencePhoto')} disabled={!cameraReady || capturing} onPress={() => void takePhoto()} />
          <AppButton title={t('common:cancel')} variant="outline" onPress={() => setTakingPhoto(false)} />
        </>}
        {capture && <>
          <Image source={{ uri: capture.uri }} style={{ width: '100%', height: 220 }} resizeMode="contain" />
          <AppButton title={t('production:uploadEvidencePhoto')} disabled={savePhoto.isPending} onPress={() => savePhoto.mutate(capture)} />
          <AppButton title={t('common:cancel')} variant="outline" disabled={savePhoto.isPending} onPress={() => setCapture(null)} />
        </>}
        {evidence.data.photos.map(photo => (
          <AppButton key={photo.id} size="sm" variant="outline" title={t('production:viewEvidencePhoto')}
            disabled={viewPhoto.isPending} onPress={() => viewPhoto.mutate(photo.id)} />
        ))}
        {image && <Image source={{ uri: image }} style={{ width: '100%', height: 220 }} resizeMode="contain" />}
      </>}
    </View>
  );
}

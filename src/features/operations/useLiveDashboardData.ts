import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../services/api/apiClient';
import { apiJobs } from '../../services/repositories/jobRepository';
import { apiBundles } from '../../services/repositories/bundleRepository';
import { masterRepository } from '../../services/repositories/masterRepository';
import { useAuthStore } from '../../store/authStore';

export interface DashboardMetrics {
  jobs: number;
  activeJobs: number;
  drafts: number;
  pastTarget: number;
  ordered: number;
  cut: number;
  inspected: number;
  rework: number;
  rejected: number;
  released: number;
  packed: number;
  dispatched: number;
  pendingShipments: number;
  incomingTransfers: number;
}

export interface LiveStockItem {
  id: string;
  sku?: string;
  name?: string;
  baseUnit?: string;
  quantity?: number;
  locationName?: string;
}

export interface LiveCartonItem {
  id: string;
  barcode: string;
  quantity: number;
  bundleCode?: string;
  jobCode?: string;
  receivedAt?: string | null;
  approvedAt?: string | null;
  dispatchedAt?: string | null;
}

export interface LiveQualityBundle {
  id?: string;
  bundleId?: string;
  bundleCode?: string;
  jobCode?: string;
  quantity?: number;
  inspected?: number;
  passed?: number;
  rework?: number;
  reworked?: number;
  rejected?: number;
  released?: number;
  packed?: number;
  ready?: boolean;
}

export function useLiveDashboardData(options?: {
  includeJobs?: boolean;
  includeFactories?: boolean;
  includeBundles?: boolean;
  includeQuality?: boolean;
  includeStock?: boolean;
  includeCartons?: boolean;
  factoryId?: string;
}) {
  const user = useAuthStore((s) => s.user);
  const isDemoMode = useAuthStore((s) => s.isDemoMode);
  const enabled = !isDemoMode && !!user;
  const fid = options?.factoryId ?? user?.factoryId;

  const metrics = useQuery({
    queryKey: ['live-dashboard-metrics', user?.id, fid],
    enabled,
    staleTime: 25000,
    queryFn: () =>
      apiRequest<DashboardMetrics>(
        fid && user?.role === 'md'
          ? `/analytics/dashboard?factoryId=${encodeURIComponent(fid)}`
          : '/analytics/dashboard',
      ),
  });

  const jobs = useQuery({
    queryKey: ['live-dashboard-jobs', user?.id, fid],
    enabled: enabled && !!options?.includeJobs,
    staleTime: 25000,
    queryFn: () => apiJobs.getJobs(),
  });

  const factories = useQuery({
    queryKey: ['live-dashboard-factories', user?.id],
    enabled: enabled && !!options?.includeFactories,
    staleTime: 60000,
    queryFn: () => masterRepository.getFactories(),
  });

  const bundles = useQuery({
    queryKey: ['live-dashboard-bundles', user?.id, fid],
    enabled: enabled && !!options?.includeBundles && !!fid,
    staleTime: 25000,
    queryFn: () => apiBundles.getBundles(fid),
  });

  const qualityBundles = useQuery({
    queryKey: ['live-dashboard-quality', user?.id, fid],
    enabled: enabled && !!options?.includeQuality && !!fid,
    staleTime: 25000,
    queryFn: () =>
      apiRequest<LiveQualityBundle[]>(`/quality/bundles?factoryId=${encodeURIComponent(fid!)}`),
  });

  const stock = useQuery({
    queryKey: ['live-dashboard-stock', user?.id, fid],
    enabled: enabled && !!options?.includeStock && !!fid,
    staleTime: 25000,
    queryFn: () =>
      apiRequest<LiveStockItem[]>(`/inventory/raw/stock?factoryId=${encodeURIComponent(fid!)}`),
  });

  const cartons = useQuery({
    queryKey: ['live-dashboard-cartons', user?.id, fid, user?.role],
    enabled: enabled && !!options?.includeCartons && !!fid,
    staleTime: 25000,
    queryFn: () => {
      const base = user?.role === 'packing-staff' ? '/packing/cartons' : '/dispatch/cartons';
      return apiRequest<LiveCartonItem[]>(`${base}?factoryId=${encodeURIComponent(fid!)}`);
    },
  });

  return { isDemoMode, user, metrics, jobs, factories, bundles, qualityBundles, stock, cartons };
}

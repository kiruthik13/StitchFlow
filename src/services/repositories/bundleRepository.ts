import { Bundle, BundleStatus } from '../../core/types';
import { BUNDLES } from '../../fixtures/mockData';
import { useAuthStore } from '../../store/authStore';
import { ApiError, apiRequest } from '../api/apiClient';

export interface IBundleRepository {
  getBundles(factoryId?: string): Promise<Bundle[]>;
  getBundleById(id: string): Promise<Bundle | null>;
  getBundleByCode(code: string): Promise<Bundle | null>;
  updateBundleStatus(id: string, status: BundleStatus, completedQty?: number): Promise<Bundle>;
}

export class MockBundleRepository implements IBundleRepository {
  private bundles: Bundle[] = [...BUNDLES];

  async getBundles(): Promise<Bundle[]> {
    return Promise.resolve([...this.bundles]);
  }

  async getBundleById(id: string): Promise<Bundle | null> {
    const bundle = this.bundles.find((b) => b.id === id) ?? null;
    return Promise.resolve(bundle);
  }

  async getBundleByCode(code: string): Promise<Bundle | null> {
    const bundle = this.bundles.find((b) => b.bundleCode.toLowerCase() === code.toLowerCase()) ?? null;
    return Promise.resolve(bundle);
  }

  async updateBundleStatus(id: string, status: BundleStatus, completedQty?: number): Promise<Bundle> {
    const idx = this.bundles.findIndex((b) => b.id === id);
    if (idx === -1) throw new Error(`Bundle with id ${id} not found.`);
    this.bundles[idx] = {
      ...this.bundles[idx],
      status,
      ...(completedQty !== undefined ? { completedQty } : {}),
    };
    return Promise.resolve(this.bundles[idx]);
  }
}

export class ApiBundleRepository implements IBundleRepository {
  private normalizeBundle(raw: Partial<Bundle> & { id: string; bundleCode: string; jobCode: string }): Bundle {
    return {
      id: raw.id,
      bundleCode: raw.bundleCode ?? 'BND',
      jobId: raw.jobId ?? '',
      jobCode: raw.jobCode ?? 'JOB',
      styleName: raw.styleName ?? raw.jobCode ?? '—',
      color: raw.color ?? '—',
      size: raw.size ?? '—',
      quantity: Number(raw.quantity ?? 0),
      completedQty: Number(raw.completedQty ?? 0),
      reworkQty: Number(raw.reworkQty ?? 0),
      rejectedQty: Number(raw.rejectedQty ?? 0),
      currentStage: raw.currentStage ?? 'Production',
      status: raw.status ?? 'sewing',
      lineId: raw.lineId ?? '',
      lineName: raw.lineName ?? 'Assigned Line',
      operatorId: raw.operatorId,
      operatorName: raw.operatorName,
      cuttingDate: raw.cuttingDate ?? '—',
      lastUpdated: raw.lastUpdated ?? new Date().toISOString(),
    };
  }

  private resolveFactoryId(factoryId?: string): string {
    const resolved = factoryId ?? useAuthStore.getState().user?.factoryId;
    if (!resolved) throw new ApiError(400, 'ERR_FACTORY_REQUIRED', 'Factory ID is required');
    return resolved;
  }

  async getBundles(factoryId?: string): Promise<Bundle[]> {
    const fid = this.resolveFactoryId(factoryId);
    const rows = await apiRequest<Array<Partial<Bundle> & { id: string; bundleCode: string; jobCode: string }>>(
      `/bundles?factoryId=${encodeURIComponent(fid)}`,
    );
    return rows.map((r) => this.normalizeBundle(r));
  }

  async getBundleById(id: string): Promise<Bundle | null> {
    try {
      const raw = await apiRequest<Partial<Bundle> & { id: string; bundleCode: string; jobCode: string }>(
        `/bundles/${encodeURIComponent(id)}`,
      );
      return raw ? this.normalizeBundle(raw) : null;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) return null;
      throw error;
    }
  }

  async getBundleByCode(code: string): Promise<Bundle | null> {
    try {
      const raw = await apiRequest<Partial<Bundle> & { id: string; bundleCode: string; jobCode: string }>(
        '/barcodes/resolve',
        {
          method: 'POST',
          body: JSON.stringify({ barcode: code.trim().toUpperCase() }),
        },
      );
      return raw ? this.normalizeBundle(raw) : null;
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) return null;
      throw error;
    }
  }

  async updateBundleStatus(id: string, _status: BundleStatus, completedQty?: number): Promise<Bundle> {
    const existing = await this.getBundleById(id);
    if (!existing) throw new ApiError(404, 'ERR_NOT_FOUND', 'Bundle not found');
    const route = await apiRequest<Array<{ id: string; ready: boolean; completedAt: string | null }>>(
      `/production/bundles/${encodeURIComponent(id)}/route`,
    );
    const nextStep = route.find((s) => s.ready && !s.completedAt);
    if (nextStep) {
      await apiRequest('/production/stages/complete', {
        method: 'POST',
        body: JSON.stringify({
          bundleId: id,
          stepId: nextStep.id,
          requestId: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
          }),
          quantity: completedQty ?? existing.quantity,
          clientOccurredAt: new Date().toISOString(),
        }),
      });
    }
    return (await this.getBundleById(id)) ?? existing;
  }
}

export const apiBundles = new ApiBundleRepository();
export const bundleRepository: IBundleRepository = process.env.EXPO_PUBLIC_DEMO_MODE === 'true'
  ? new MockBundleRepository()
  : apiBundles;

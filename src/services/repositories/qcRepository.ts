import { QCInspection } from '../../core/types';
import { QC_INSPECTIONS } from '../../fixtures/mockData';
import { useAuthStore } from '../../store/authStore';
import { ApiError, apiRequest } from '../api/apiClient';

export interface IQCRepository {
  getInspections(factoryId?: string): Promise<QCInspection[]>;
  getInspectionById(id: string): Promise<QCInspection | null>;
  updateInspection(id: string, update: Partial<QCInspection>): Promise<QCInspection>;
  releasePieces(id: string, releaseQty: number): Promise<QCInspection>;
}

export class MockQCRepository implements IQCRepository {
  private inspections: QCInspection[] = [...QC_INSPECTIONS];

  async getInspections(): Promise<QCInspection[]> {
    return Promise.resolve([...this.inspections]);
  }

  async getInspectionById(id: string): Promise<QCInspection | null> {
    const insp = this.inspections.find((i) => i.id === id) ?? null;
    return Promise.resolve(insp);
  }

  async updateInspection(id: string, update: Partial<QCInspection>): Promise<QCInspection> {
    const idx = this.inspections.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`Inspection ${id} not found.`);
    this.inspections[idx] = { ...this.inspections[idx], ...update };
    return Promise.resolve(this.inspections[idx]);
  }

  async releasePieces(id: string, releaseQty: number): Promise<QCInspection> {
    const idx = this.inspections.findIndex((i) => i.id === id);
    if (idx === -1) throw new Error(`Inspection ${id} not found.`);
    const insp = this.inspections[idx];
    if (releaseQty > insp.passedQty) {
      throw new Error(`Cannot release ${releaseQty} pieces. Maximum release quantity eligible is ${insp.passedQty}.`);
    }
    this.inspections[idx] = {
      ...insp,
      releasedQty: releaseQty,
      status: 'released',
    };
    return Promise.resolve(this.inspections[idx]);
  }
}

export class ApiQCRepository implements IQCRepository {
  private resolveFactoryId(factoryId?: string): string {
    const resolved = factoryId ?? useAuthStore.getState().user?.factoryId;
    if (!resolved) throw new ApiError(400, 'ERR_FACTORY_REQUIRED', 'Factory ID is required');
    return resolved;
  }

  async getInspections(factoryId?: string): Promise<QCInspection[]> {
    const fid = this.resolveFactoryId(factoryId);
    return apiRequest<QCInspection[]>(`/quality/bundles?factoryId=${encodeURIComponent(fid)}`);
  }

  async getInspectionById(id: string): Promise<QCInspection | null> {
    try {
      return await apiRequest<QCInspection>(`/quality/bundles/${encodeURIComponent(id)}`);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 404) return null;
      throw error;
    }
  }

  async updateInspection(id: string, update: Partial<QCInspection>): Promise<QCInspection> {
    return apiRequest<QCInspection>('/quality/inspections', {
      method: 'POST',
      body: JSON.stringify({
        bundleId: id,
        requestId: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        }),
        passed: update.passedQty ?? 0,
        rejected: update.rejectedQty ?? 0,
        rework: update.reworkQty ?? 0,
        held: 0,
      }),
    });
  }

  async releasePieces(id: string, releaseQty: number): Promise<QCInspection> {
    return apiRequest<QCInspection>('/quality/releases', {
      method: 'POST',
      body: JSON.stringify({
        bundleId: id,
        requestId: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        }),
        quantity: releaseQty,
      }),
    });
  }
}

export const apiQC = new ApiQCRepository();
export const qcRepository: IQCRepository = process.env.EXPO_PUBLIC_DEMO_MODE === 'true'
  ? new MockQCRepository()
  : apiQC;

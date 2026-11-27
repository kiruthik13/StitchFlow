import { Buyer, Style, Line, Factory } from '../../core/types';
import { BUYERS, STYLES, LINES, FACTORIES } from '../../fixtures/mockData';
import { useAuthStore } from '../../store/authStore';
import { ApiError, apiRequest } from '../api/apiClient';

export interface IMasterRepository {
  getBuyers(factoryId?: string): Promise<Buyer[]>;
  getStyles(factoryId?: string): Promise<Style[]>;
  getLines(factoryId?: string): Promise<Line[]>;
  getFactories(): Promise<Factory[]>;
}

export class MockMasterRepository implements IMasterRepository {
  async getBuyers(): Promise<Buyer[]> {
    return Promise.resolve([...BUYERS]);
  }
  async getStyles(): Promise<Style[]> {
    return Promise.resolve([...STYLES]);
  }
  async getLines(): Promise<Line[]> {
    return Promise.resolve([...LINES]);
  }
  async getFactories(): Promise<Factory[]> {
    return Promise.resolve([...FACTORIES]);
  }
}

export class ApiMasterRepository implements IMasterRepository {
  private resolveFactoryId(factoryId?: string): string {
    const resolved = factoryId ?? useAuthStore.getState().user?.factoryId;
    if (!resolved) throw new ApiError(400, 'ERR_FACTORY_REQUIRED', 'Factory ID is required');
    return resolved;
  }

  async getBuyers(factoryId?: string): Promise<Buyer[]> {
    const fid = this.resolveFactoryId(factoryId);
    return apiRequest<Buyer[]>(`/masters/buyers?factoryId=${encodeURIComponent(fid)}`);
  }

  async getStyles(factoryId?: string): Promise<Style[]> {
    const fid = this.resolveFactoryId(factoryId);
    return apiRequest<Style[]>(`/masters/styles?factoryId=${encodeURIComponent(fid)}`);
  }

  async getLines(factoryId?: string): Promise<Line[]> {
    const fid = this.resolveFactoryId(factoryId);
    const res = await apiRequest<{ lines: Line[] }>(`/factories/${encodeURIComponent(fid)}/hierarchy`);
    return res.lines;
  }

  async getFactories(): Promise<Factory[]> {
    const rows = await apiRequest<Array<Record<string, unknown>>>('/factories');
    return rows.map((r) => ({
      id: String(r.id),
      name: String(r.name ?? ''),
      code: String(r.code ?? ''),
      location: String(r.location ?? ''),
      totalLines: Number(r.totalLines ?? r.total_lines ?? 0),
      activeLines: Number(r.activeLines ?? r.active_lines ?? 0),
      capacity: Number(r.capacity ?? 0),
      unitsCount: r.unitsCount !== undefined ? Number(r.unitsCount) : undefined,
      activeJobsCount: r.activeJobsCount !== undefined ? Number(r.activeJobsCount) : undefined,
      orderedQty: r.orderedQty !== undefined ? Number(r.orderedQty) : undefined,
      cutQty: r.cutQty !== undefined ? Number(r.cutQty) : undefined,
      packedQty: r.packedQty !== undefined ? Number(r.packedQty) : undefined,
      openIssuesCount: r.openIssuesCount !== undefined ? Number(r.openIssuesCount) : undefined,
    })) as Factory[];
  }
}

export const apiMasters = new ApiMasterRepository();
export const masterRepository: IMasterRepository = process.env.EXPO_PUBLIC_DEMO_MODE === 'true'
  ? new MockMasterRepository()
  : apiMasters;

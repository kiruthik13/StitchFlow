import { StockItem, Carton } from '../../core/types';
import { STOCK_ITEMS, CARTONS } from '../../fixtures/mockData';
import { useAuthStore } from '../../store/authStore';
import { ApiError, apiRequest } from '../api/apiClient';

export interface IInventoryRepository {
  getStockItems(factoryId?: string): Promise<StockItem[]>;
  getCartons(factoryId?: string): Promise<Carton[]>;
  sealCarton(cartonId: string): Promise<Carton>;
  createCarton(data: Omit<Carton, 'id' | 'cartonCode'>): Promise<Carton>;
}

export class MockInventoryRepository implements IInventoryRepository {
  private items: StockItem[] = [...STOCK_ITEMS];
  private cartons: Carton[] = [...CARTONS];

  async getStockItems(): Promise<StockItem[]> {
    return Promise.resolve([...this.items]);
  }

  async getCartons(): Promise<Carton[]> {
    return Promise.resolve([...this.cartons]);
  }

  async sealCarton(cartonId: string): Promise<Carton> {
    const idx = this.cartons.findIndex((c) => c.id === cartonId);
    if (idx === -1) throw new Error(`Carton ${cartonId} not found.`);
    this.cartons[idx] = { ...this.cartons[idx], status: 'sealed' };
    return Promise.resolve(this.cartons[idx]);
  }

  async createCarton(data: Omit<Carton, 'id' | 'cartonCode'>): Promise<Carton> {
    const code = `CTN-${Date.now().toString().slice(-5)}`;
    const newCarton: Carton = {
      ...data,
      id: `carton-${Date.now()}`,
      cartonCode: code,
    };
    this.cartons.unshift(newCarton);
    return Promise.resolve(newCarton);
  }
}

export class ApiInventoryRepository implements IInventoryRepository {
  private resolveFactoryId(factoryId?: string): string {
    const resolved = factoryId ?? useAuthStore.getState().user?.factoryId;
    if (!resolved) throw new ApiError(400, 'ERR_FACTORY_REQUIRED', 'Factory ID is required');
    return resolved;
  }

  async getStockItems(factoryId?: string): Promise<StockItem[]> {
    const fid = this.resolveFactoryId(factoryId);
    return apiRequest<StockItem[]>(`/inventory/raw/stock?factoryId=${encodeURIComponent(fid)}`);
  }

  async getCartons(factoryId?: string): Promise<Carton[]> {
    const fid = this.resolveFactoryId(factoryId);
    return apiRequest<Carton[]>(`/dispatch/cartons?factoryId=${encodeURIComponent(fid)}`);
  }

  async sealCarton(cartonId: string): Promise<Carton> {
    return apiRequest<Carton>(`/dispatch/cartons/${encodeURIComponent(cartonId)}/receive`, {
      method: 'POST',
    });
  }

  async createCarton(data: Omit<Carton, 'id' | 'cartonCode'> & { bundleId?: string }): Promise<Carton> {
    return apiRequest<Carton>('/packing/cartons', {
      method: 'POST',
      body: JSON.stringify({
        bundleId: data.bundleId ?? data.jobId,
        requestId: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        }),
        quantity: data.quantity,
      }),
    });
  }
}

export const apiInventory = new ApiInventoryRepository();
export const inventoryRepository: IInventoryRepository = process.env.EXPO_PUBLIC_DEMO_MODE === 'true'
  ? new MockInventoryRepository()
  : apiInventory;

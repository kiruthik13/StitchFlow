import { StockItem, Carton } from '../../core/types';
import { STOCK_ITEMS, CARTONS } from '../../fixtures/mockData';

export interface IInventoryRepository {
  getStockItems(): Promise<StockItem[]>;
  getCartons(): Promise<Carton[]>;
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

export const inventoryRepository = new MockInventoryRepository();

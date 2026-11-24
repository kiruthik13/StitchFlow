import { Bundle, BundleStatus } from '../../core/types';
import { BUNDLES } from '../../fixtures/mockData';

export interface IBundleRepository {
  getBundles(): Promise<Bundle[]>;
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

export const bundleRepository = new MockBundleRepository();

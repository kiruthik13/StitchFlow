import { QCInspection, QCStatus } from '../../core/types';
import { QC_INSPECTIONS } from '../../fixtures/mockData';

export interface IQCRepository {
  getInspections(): Promise<QCInspection[]>;
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

export const qcRepository = new MockQCRepository();

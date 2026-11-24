import { Buyer, Style, Line, Factory } from '../../core/types';
import { BUYERS, STYLES, LINES, FACTORIES } from '../../fixtures/mockData';

export interface IMasterRepository {
  getBuyers(): Promise<Buyer[]>;
  getStyles(): Promise<Style[]>;
  getLines(): Promise<Line[]>;
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

export const masterRepository = new MockMasterRepository();

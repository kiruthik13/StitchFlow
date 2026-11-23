import { create } from 'zustand';
import { Bundle, Job, Carton, QCInspection } from '../core/types';
import { BUNDLES, JOBS, CARTONS, QC_INSPECTIONS } from '../fixtures/mockData';

// Demo store for mutable state changes in the frontend demo
interface DemoState {
  bundles: Bundle[];
  jobs: Job[];
  cartons: Carton[];
  qcInspections: QCInspection[];
  recentScans: string[];

  // Bundle actions
  updateBundleStatus: (bundleId: string, status: Bundle['status'], qty?: number) => void;
  addReworkToBundle: (bundleId: string, qty: number) => void;

  // Job actions  
  updateJobStatus: (jobId: string, status: Job['status']) => void;
  addJob: (jobData: {
    jobNumber: string;
    buyerName: string;
    styleName: string;
    lineName: string;
    targetQuantity: number;
    completedQuantity: number;
    sam: number;
    targetDate: string;
    status: Job['status'];
  }) => void;

  // Packing actions
  createCarton: (carton: Omit<Carton, 'id' | 'cartonCode'>) => Carton;
  sealCarton: (cartonId: string) => void;

  // QC actions
  updateQCInspection: (id: string, update: Partial<QCInspection>) => void;

  // Scanner actions
  addScan: (code: string) => void;

  // Quantity entry
  submitProductionQty: (bundleId: string, qty: number, stage: string) => boolean;
}

let cartonCounter = 10048;

export const useDemoStore = create<DemoState>((set, get) => ({
  bundles: [...BUNDLES],
  jobs: [...JOBS],
  cartons: [...CARTONS],
  qcInspections: [...QC_INSPECTIONS],
  recentScans: [],

  updateBundleStatus: (bundleId, status, qty) => {
    set((state) => ({
      bundles: state.bundles.map((b) =>
        b.id === bundleId
          ? {
              ...b,
              status,
              ...(qty !== undefined ? { completedQty: qty } : {}),
              currentStage: statusToStage(status),
            }
          : b
      ),
    }));
  },

  addReworkToBundle: (bundleId, qty) => {
    set((state) => ({
      bundles: state.bundles.map((b) =>
        b.id === bundleId ? { ...b, reworkQty: b.reworkQty + qty } : b
      ),
    }));
  },

  updateJobStatus: (jobId, status) => {
    set((state) => ({
      jobs: state.jobs.map((j) => (j.id === jobId ? { ...j, status } : j)),
    }));
  },

  addJob: (jobData) => {
    const newJob: Job = {
      id: `job-${Date.now()}`,
      jobCode: jobData.jobNumber,
      factoryId: 'factory-a',
      factoryName: 'Tirupur Unit 1',
      buyerId: 'buyer-1',
      buyerName: jobData.buyerName,
      styleId: 'style-1',
      styleName: jobData.styleName,
      orderQuantity: jobData.targetQuantity,
      status: jobData.status,
      samValue: jobData.sam || 18.5,
      startDate: new Date().toISOString().split('T')[0],
      targetDate: jobData.targetDate,
      lineId: 'line-1',
      lineName: jobData.lineName,
      colors: ['Navy', 'Heather Grey'],
      sizes: ['S', 'M', 'L', 'XL'],
      cuttingQty: 0,
      sewingOutQty: 0,
      packingQty: 0,
      reworkQty: 0,
      rejectedQty: 0,
      pendingQcQty: 0,
      efficiency: 0,
    };
    set((state) => ({ jobs: [newJob, ...state.jobs] }));
  },

  createCarton: (cartonData) => {
    const id = `ctn-${Date.now()}`;
    const cartonCode = `CTN-${cartonCounter++}`;
    const newCarton: Carton = { ...cartonData, id, cartonCode };
    set((state) => ({ cartons: [...state.cartons, newCarton] }));
    return newCarton;
  },

  sealCarton: (cartonId) => {
    set((state) => ({
      cartons: state.cartons.map((c) =>
        c.id === cartonId ? { ...c, status: 'sealed' } : c
      ),
    }));
  },

  updateQCInspection: (id, update) => {
    set((state) => ({
      qcInspections: state.qcInspections.map((q) =>
        q.id === id ? { ...q, ...update } : q
      ),
    }));
  },

  addScan: (code) => {
    set((state) => ({
      recentScans: [code, ...state.recentScans.slice(0, 19)],
    }));
  },

  submitProductionQty: (bundleId, qty, stage) => {
    const bundle = get().bundles.find((b) => b.id === bundleId);
    if (!bundle) return false;
    if (qty > bundle.quantity) return false;

    const newStatus = stageToStatus(stage);
    set((state) => ({
      bundles: state.bundles.map((b) =>
        b.id === bundleId
          ? { ...b, completedQty: qty, status: newStatus, currentStage: stage }
          : b
      ),
    }));
    return true;
  },
}));

function statusToStage(status: Bundle['status']): string {
  const map: Record<Bundle['status'], string> = {
    cutting: 'Cutting',
    sewing: 'Sewing',
    kaja: 'Kaja',
    ironing: 'Ironing',
    'qc-pending': 'QC',
    'qc-passed': 'QC Passed',
    rework: 'Rework',
    packing: 'Packing',
    packed: 'Packed',
    dispatched: 'Dispatched',
  };
  return map[status] || status;
}

function stageToStatus(stage: string): Bundle['status'] {
  const map: Record<string, Bundle['status']> = {
    Cutting: 'cutting',
    Sewing: 'sewing',
    Kaja: 'kaja',
    Ironing: 'ironing',
    QC: 'qc-pending',
    Packing: 'packing',
  };
  return map[stage] || 'sewing';
}

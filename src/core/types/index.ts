// Core type definitions for StitchFlow

export type UserRole =
  | 'md'
  | 'factory-manager'
  | 'supervisor'
  | 'operator'
  | 'qc-inspector'
  | 'store-dispatch'
  | 'packing-staff';

export type ThemeMode = 'light' | 'dark';

export type Language = 'en' | 'ta' | 'hi';

export type JobStatus =
  | 'draft'
  | 'active'
  | 'on-hold'
  | 'completed'
  | 'closed'
  | 'cancelled';

export type BundleStatus =
  | 'cutting'
  | 'sewing'
  | 'kaja'
  | 'ironing'
  | 'qc-pending'
  | 'qc-passed'
  | 'rework'
  | 'packing'
  | 'packed'
  | 'dispatched';

export type QCStatus =
  | 'pending'
  | 'inspecting'
  | 'passed'
  | 'rework'
  | 'hold'
  | 'rejected'
  | 'released';

export type ShiftType = 'morning' | 'afternoon' | 'night';

export type StockMovementType =
  | 'input-in'
  | 'input-out'
  | 'output-in'
  | 'output-out'
  | 'transfer'
  | 'adjustment';

export interface Factory {
  id: string;
  name: string;
  code: string;
  location: string;
  totalLines: number;
  activeLines: number;
  capacity: number;
}

export interface User {
  id: string;
  employeeId: string;
  name: string;
  role: UserRole;
  factoryId: string;
  factoryName: string;
  lineId?: string;
  lineName?: string;
  avatarInitials: string;
  shiftType: ShiftType;
}

export interface Buyer {
  id: string;
  name: string;
  code: string;
  country: string;
}

export interface Style {
  id: string;
  name: string;
  code: string;
  buyerId: string;
  category: string;
  description: string;
  sizes: string[];
  colors: string[];
  samValue: number; // Standard Allowed Minutes
}

export interface Line {
  id: string;
  factoryId: string;
  name: string;
  code: string;
  capacity: number;
  supervisorId?: string;
  stages: string[];
}

export interface Job {
  id: string;
  jobCode: string;
  factoryId: string;
  factoryName: string;
  buyerId: string;
  buyerName: string;
  styleId: string;
  styleName: string;
  orderQuantity: number;
  status: JobStatus;
  startDate: string;
  targetDate: string;
  lineId: string;
  lineName: string;
  colors: string[];
  sizes: string[];
  cuttingQty: number;
  sewingOutQty: number;
  packingQty: number;
  reworkQty: number;
  rejectedQty: number;
  pendingQcQty: number;
  efficiency: number;
  samValue: number;
}

export interface Bundle {
  id: string;
  bundleCode: string;
  jobId: string;
  jobCode: string;
  styleName: string;
  size: string;
  color: string;
  quantity: number;
  status: BundleStatus;
  lineId: string;
  lineName: string;
  cuttingDate: string;
  currentStage: string;
  operatorId?: string;
  operatorName?: string;
  completedQty: number;
  reworkQty: number;
  rejectedQty: number;
}

export interface QCInspection {
  id: string;
  bundleId: string;
  bundleCode: string;
  jobId: string;
  jobCode: string;
  inspectorId: string;
  inspectorName: string;
  status: QCStatus;
  inspectedQty: number;
  passedQty: number;
  reworkQty: number;
  rejectedQty: number;
  releasedQty: number;
  defects: QCDefect[];
  inspectionDate: string;
  notes?: string;
}

export interface QCDefect {
  id: string;
  code: string;
  description: string;
  count: number;
  severity: 'minor' | 'major' | 'critical';
  location?: string;
}

export interface StockItem {
  id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  locationId: string;
  locationName: string;
}

export interface Carton {
  id: string;
  cartonCode: string;
  jobId: string;
  jobCode: string;
  styleName: string;
  color: string;
  size: string;
  quantity: number;
  status: 'open' | 'sealed' | 'dispatched';
  createdAt: string;
  packedBy: string;
}

export interface Alert {
  id: string;
  type: 'bottleneck' | 'rework' | 'quality' | 'delay' | 'stock' | 'system';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  factoryId?: string;
  jobId?: string;
  timestamp: string;
  isRead: boolean;
}

export interface ShiftSummary {
  shiftType: ShiftType;
  date: string;
  targetQty: number;
  actualQty: number;
  packingQty: number;
  reworkQty: number;
  efficiency: number;
  pacePerHour: number;
}

export interface ProductionStage {
  stageName: string;
  stageCode: string;
  quantity: number;
  wip: number;
  completed: number;
  pending: number;
}

export interface ReworkTask {
  id: string;
  bundleCode: string;
  jobCode: string;
  defectDescription: string;
  quantity: number;
  assignedTo?: string;
  status: 'pending' | 'in-progress' | 'completed';
  dueDate: string;
  createdAt: string;
}

export interface ScanResult {
  code: string;
  type: string;
  timestamp: string;
  resolvedBundle?: Bundle;
  resolvedJob?: Job;
  status: 'success' | 'not-found' | 'duplicate' | 'error';
}

export interface Permission {
  canScan: boolean;
  canCreateJob: boolean;
  canEditJob: boolean;
  canCloseJob: boolean;
  canDoQC: boolean;
  canReleasePieces: boolean;
  canPack: boolean;
  canDispatch: boolean;
  canViewMD: boolean;
  canManageUsers: boolean;
  canManageMasters: boolean;
  canViewReports: boolean;
  canApproveRework: boolean;
  canManageInventory: boolean;
}

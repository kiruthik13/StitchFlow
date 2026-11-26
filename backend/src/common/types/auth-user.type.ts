export type RoleCode =
  | 'md'
  | 'factory-manager'
  | 'supervisor'
  | 'operator'
  | 'qc-inspector'
  | 'store-dispatch'
  | 'packing-staff';

export type AccountStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface AuthenticatedUser {
  id: string;
  email: string;
  employeeId: string;
  name: string;
  role: RoleCode;
  accountStatus: AccountStatus;
  organizationId: string;
  assignedFactoryIds: string[];
  primaryFactoryId?: string;
  primaryLineId?: string;
  permissions: string[];
}

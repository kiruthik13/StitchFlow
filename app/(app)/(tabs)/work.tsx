import React from 'react';
import { useAuthStore } from '../../../src/store/authStore';
import { UserRole } from '../../../src/core/types';
import { MDWork } from '../../../src/roles/md/MDDashboard';
import { FMWork } from '../../../src/roles/factory-manager/FMDashboard';
import { SupervisorWork } from '../../../src/roles/supervisor/SupervisorDashboard';
import { OperatorWork } from '../../../src/roles/operator/OperatorDashboard';
import { QCWork } from '../../../src/roles/qc-inspector/QCDashboard';
import { StoreWork } from '../../../src/roles/store-dispatch/StoreDashboard';
import { PackingWork } from '../../../src/roles/packing-staff/PackingDashboard';

export default function WorkTabScreen() {
  const { user } = useAuthStore();
  const role = user?.role as UserRole | undefined;

  if (!user || !role) return null;

  switch (role) {
    case 'md':              return <MDWork />;
    case 'factory-manager': return <FMWork />;
    case 'supervisor':      return <SupervisorWork />;
    case 'operator':        return <OperatorWork />;
    case 'qc-inspector':    return <QCWork />;
    case 'store-dispatch':  return <StoreWork />;
    case 'packing-staff':   return <PackingWork />;
    default:                return <OperatorWork />;
  }
}

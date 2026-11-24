import React from 'react';
import { useAuthStore } from '../../../src/store/authStore';
import { UserRole } from '../../../src/core/types';
import { MDDashboard } from '../../../src/roles/md/MDDashboard';
import { FMDashboard } from '../../../src/roles/factory-manager/FMDashboard';
import { SupervisorDashboard } from '../../../src/roles/supervisor/SupervisorDashboard';
import { OperatorDashboard } from '../../../src/roles/operator/OperatorDashboard';
import { QCDashboard } from '../../../src/roles/qc-inspector/QCDashboard';
import { StoreDashboard } from '../../../src/roles/store-dispatch/StoreDashboard';
import { PackingDashboard } from '../../../src/roles/packing-staff/PackingDashboard';

export default function HomeTabScreen() {
  const { user } = useAuthStore();
  const role = user?.role as UserRole | undefined;

  if (!user || !role) return null;

  switch (role) {
    case 'md': return <MDDashboard />;
    case 'factory-manager': return <FMDashboard />;
    case 'supervisor': return <SupervisorDashboard />;
    case 'operator': return <OperatorDashboard />;
    case 'qc-inspector': return <QCDashboard />;
    case 'store-dispatch': return <StoreDashboard />;
    case 'packing-staff': return <PackingDashboard />;
    default: return <OperatorDashboard />;
  }
}

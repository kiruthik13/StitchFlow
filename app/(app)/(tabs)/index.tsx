import React, { Suspense, lazy } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '../../../src/store/authStore';
import { UserRole } from '../../../src/core/types';
import { DashboardSkeleton } from '../../../src/design-system/components/dashboard';
import { useThemeStore } from '../../../src/store/themeStore';
import { spacing } from '../../../src/design-system/tokens/spacing';

// Lazy-load role dashboards so only the authenticated user's role chunk is evaluated at startup
const MDDashboard = lazy(() =>
  import('../../../src/roles/md/MDDashboard').then((m) => ({ default: m.MDDashboard })),
);
const FMDashboard = lazy(() =>
  import('../../../src/roles/factory-manager/FMDashboard').then((m) => ({ default: m.FMDashboard })),
);
const SupervisorDashboard = lazy(() =>
  import('../../../src/roles/supervisor/SupervisorDashboard').then((m) => ({ default: m.SupervisorDashboard })),
);
const OperatorDashboard = lazy(() =>
  import('../../../src/roles/operator/OperatorDashboard').then((m) => ({ default: m.OperatorDashboard })),
);
const QCDashboard = lazy(() =>
  import('../../../src/roles/qc-inspector/QCDashboard').then((m) => ({ default: m.QCDashboard })),
);
const StoreDashboard = lazy(() =>
  import('../../../src/roles/store-dispatch/StoreDashboard').then((m) => ({ default: m.StoreDashboard })),
);
const PackingDashboard = lazy(() =>
  import('../../../src/roles/packing-staff/PackingDashboard').then((m) => ({ default: m.PackingDashboard })),
);

function RoleFallback() {
  const { tokens } = useThemeStore();
  return (
    <View style={{ flex: 1, backgroundColor: tokens.background, padding: spacing[4] }}>
      <DashboardSkeleton />
    </View>
  );
}

export default function HomeTabScreen() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role as UserRole | undefined;

  if (!user || !role) return null;

  const renderRole = () => {
    switch (role) {
      case 'md':
        return <MDDashboard />;
      case 'factory-manager':
        return <FMDashboard />;
      case 'supervisor':
        return <SupervisorDashboard />;
      case 'operator':
        return <OperatorDashboard />;
      case 'qc-inspector':
        return <QCDashboard />;
      case 'store-dispatch':
        return <StoreDashboard />;
      case 'packing-staff':
        return <PackingDashboard />;
      default:
        return <OperatorDashboard />;
    }
  };

  return <Suspense fallback={<RoleFallback />}>{renderRole()}</Suspense>;
}

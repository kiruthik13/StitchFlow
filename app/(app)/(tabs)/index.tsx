import React, { Component, Suspense, lazy } from 'react';
import { View } from 'react-native';
import { useAuthStore } from '../../../src/store/authStore';
import { UserRole } from '../../../src/core/types';
import { DashboardSkeleton } from '../../../src/design-system/components/dashboard';
import { AppText } from '../../../src/design-system/components/AppText';
import { AppButton } from '../../../src/design-system/components/AppButton';
import { useThemeStore } from '../../../src/store/themeStore';
import { spacing } from '../../../src/design-system/tokens/spacing';

class DashboardErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message ?? 'Unexpected dashboard error' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6], gap: spacing[3] }}>
          <AppText variant="h4" bold>Dashboard Error</AppText>
          <AppText variant="bodySmall" color="secondary" center>{this.state.message}</AppText>
          <AppButton title="Retry" onPress={() => this.setState({ hasError: false, message: '' })} />
        </View>
      );
    }
    return this.props.children;
  }
}

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

  return (
    <DashboardErrorBoundary>
      <Suspense fallback={<RoleFallback />}>{renderRole()}</Suspense>
    </DashboardErrorBoundary>
  );
}

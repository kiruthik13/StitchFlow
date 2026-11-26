-- StitchFlow Essential System Initialization (Safe for Live Production)
-- Initializes the 7 canonical roles, 17 permissions, and role-permission mappings.
-- Contains ZERO synthetic factories, employees, or production transactions.

INSERT INTO public.roles (code, display_name, description) VALUES
  ('md', 'Managing Director', 'Organization-wide executive analytics'),
  ('factory-manager', 'Factory Manager', 'Assigned factory operations, jobs, masters, users'),
  ('supervisor', 'Supervisor', 'Assigned line cockpit, work assignment, bottlenecks'),
  ('operator', 'Operator', 'Assigned line/station production & cutting line entry'),
  ('qc-inspector', 'QC Inspector', 'Independent quality inspection, rework & release'),
  ('store-dispatch', 'Store / Dispatch', 'Warehouse receipts, transfers, physical dispatch'),
  ('packing-staff', 'Packing Staff', 'QC-bounded carton creation & FG handover')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.permissions (code, description) VALUES
  ('CAN_LOOKUP_BARCODE', 'View barcode and bundle details (read-only lookup)'),
  ('CAN_SCAN_PRODUCTION', 'Perform routine production/floor scan transactions'),
  ('CAN_VIEW_ALL_FACTORIES', 'View consolidated organization-wide factory metrics'),
  ('CAN_MANAGE_JOBS', 'Create, edit, hold, and resume production jobs'),
  ('CAN_CLOSE_JOB', 'Close reconciled production jobs'),
  ('CAN_ASSIGN_WORK', 'Assign bundles and operators to workstations'),
  ('CAN_ENTER_PRODUCTION', 'Submit cutting/sewing/finishing production output'),
  ('CAN_PERFORM_QC', 'Log inline, endline, measurement, and reinspection results'),
  ('CAN_RELEASE_QC', 'Grant independent QC release for packing'),
  ('CAN_MANAGE_INVENTORY', 'Record goods receipts, stock counts, and material issues'),
  ('CAN_MONITOR_DISPATCH', 'Monitor dispatch activities and manifests'),
  ('CAN_APPROVE_DISPATCH', 'Approve dispatch manifests when authorized'),
  ('CAN_EXECUTE_DISPATCH', 'Execute physical dispatch and gate pass transactions'),
  ('CAN_CREATE_CARTON', 'Create and seal packing cartons within QC release limits'),
  ('CAN_VIEW_EXECUTIVE_REPORTS', 'View executive and operational reports'),
  ('CAN_VIEW_FINANCIAL_SAM', 'View and configure SAM planning benchmarks'),
  ('CAN_MANAGE_USERS', 'Approve, suspend, and assign employee accounts')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_code, permission_code) VALUES
  ('md', 'CAN_VIEW_ALL_FACTORIES'),
  ('md', 'CAN_MONITOR_DISPATCH'),
  ('md', 'CAN_VIEW_EXECUTIVE_REPORTS'),
  ('md', 'CAN_VIEW_FINANCIAL_SAM'),

  ('factory-manager', 'CAN_LOOKUP_BARCODE'),
  ('factory-manager', 'CAN_MANAGE_JOBS'),
  ('factory-manager', 'CAN_CLOSE_JOB'),
  ('factory-manager', 'CAN_ASSIGN_WORK'),
  ('factory-manager', 'CAN_MANAGE_INVENTORY'),
  ('factory-manager', 'CAN_MONITOR_DISPATCH'),
  ('factory-manager', 'CAN_APPROVE_DISPATCH'),
  ('factory-manager', 'CAN_VIEW_EXECUTIVE_REPORTS'),
  ('factory-manager', 'CAN_VIEW_FINANCIAL_SAM'),
  ('factory-manager', 'CAN_MANAGE_USERS'),

  ('supervisor', 'CAN_LOOKUP_BARCODE'),
  ('supervisor', 'CAN_SCAN_PRODUCTION'),
  ('supervisor', 'CAN_ASSIGN_WORK'),
  ('supervisor', 'CAN_ENTER_PRODUCTION'),
  ('supervisor', 'CAN_VIEW_EXECUTIVE_REPORTS'),

  ('operator', 'CAN_LOOKUP_BARCODE'),
  ('operator', 'CAN_SCAN_PRODUCTION'),
  ('operator', 'CAN_ENTER_PRODUCTION'),

  ('qc-inspector', 'CAN_LOOKUP_BARCODE'),
  ('qc-inspector', 'CAN_SCAN_PRODUCTION'),
  ('qc-inspector', 'CAN_PERFORM_QC'),
  ('qc-inspector', 'CAN_RELEASE_QC'),
  ('qc-inspector', 'CAN_VIEW_EXECUTIVE_REPORTS'),

  ('store-dispatch', 'CAN_LOOKUP_BARCODE'),
  ('store-dispatch', 'CAN_SCAN_PRODUCTION'),
  ('store-dispatch', 'CAN_MANAGE_INVENTORY'),
  ('store-dispatch', 'CAN_MONITOR_DISPATCH'),
  ('store-dispatch', 'CAN_EXECUTE_DISPATCH'),
  ('store-dispatch', 'CAN_VIEW_EXECUTIVE_REPORTS'),

  ('packing-staff', 'CAN_LOOKUP_BARCODE'),
  ('packing-staff', 'CAN_SCAN_PRODUCTION'),
  ('packing-staff', 'CAN_CREATE_CARTON')
ON CONFLICT DO NOTHING;

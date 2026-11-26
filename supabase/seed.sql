-- Synthetic Development & Test Seed Data (Idempotent)
-- Run supabase/essential-seed.sql first for canonical roles & permissions.

BEGIN;

-- 1. Organization & Factories
INSERT INTO public.organizations (id, code, name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'ORG-STITCH-DEMO', 'StitchFlow Apparel Group (Dev)')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.factories (id, organization_id, code, name, location, total_lines, active_lines, capacity) VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'FAC-TPR-1', 'Tirupur Unit 1', 'Tirupur, TN', 8, 6, 4800),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'FAC-BLR-2', 'Bengaluru Apparel Park', 'Bengaluru, KA', 6, 5, 3600)
ON CONFLICT (organization_id, code) DO NOTHING;

-- 2. Units, Departments, Production Lines & Workstations
INSERT INTO public.units (id, factory_id, code, name) VALUES
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'UNIT-TPR-1', 'Tirupur Main Block'),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', 'UNIT-BLR-1', 'Bengaluru Main Block')
ON CONFLICT (factory_id, code) DO NOTHING;

INSERT INTO public.departments (id, unit_id, code, name) VALUES
  ('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', 'DEPT-PROD', 'Garment Production'),
  ('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333302', 'DEPT-PROD', 'Garment Production')
ON CONFLICT (unit_id, code) DO NOTHING;

INSERT INTO public.production_lines (id, factory_id, department_id, code, name, capacity, stages) VALUES
  ('55555555-5555-5555-5555-555555555501', '22222222-2222-2222-2222-222222222201', '44444444-4444-4444-4444-444444444401', 'LINE-1', 'Line 1 (Tops)', 800, ARRAY['Cutting', 'Sewing', 'Kaja', 'Ironing', 'QC', 'Packing']),
  ('55555555-5555-5555-5555-555555555502', '22222222-2222-2222-2222-222222222201', '44444444-4444-4444-4444-444444444401', 'LINE-2', 'Line 2 (Bottoms)', 650, ARRAY['Cutting', 'Sewing', 'Kaja', 'Ironing', 'QC', 'Packing']),
  ('55555555-5555-5555-5555-555555555503', '22222222-2222-2222-2222-222222222202', '44444444-4444-4444-4444-444444444402', 'LINE-3', 'Line 3 (Dresses)', 700, ARRAY['Cutting', 'Sewing', 'Kaja', 'Ironing', 'QC', 'Packing'])
ON CONFLICT (factory_id, code) DO NOTHING;

INSERT INTO public.workstations (id, line_id, code, name, machine_type) VALUES
  ('66666666-6666-6666-6666-666666666601', '55555555-5555-5555-5555-555555555501', 'M-L1-01', 'Collar Runstitch Station', 'Single Needle Lockstitch'),
  ('66666666-6666-6666-6666-666666666602', '55555555-5555-5555-5555-555555555501', 'M-L1-02', 'Sleeve Overlock Station', '4-Thread Overlock')
ON CONFLICT (line_id, code) DO NOTHING;

-- 3. Core Masters (Buyers, Styles, Measurement Specs, Storage Locations)
INSERT INTO public.buyers (id, factory_id, code, name) VALUES
  ('77777777-7777-7777-7777-777777777701', '22222222-2222-2222-2222-222222222201', 'BYR-ZRA', 'Zara International'),
  ('77777777-7777-7777-7777-777777777702', '22222222-2222-2222-2222-222222222201', 'BYR-HM', 'H&M Global'),
  ('77777777-7777-7777-7777-777777777703', '22222222-2222-2222-2222-222222222202', 'BYR-MNS', 'Marks & Spencer')
ON CONFLICT (factory_id, code) DO NOTHING;

INSERT INTO public.garment_styles (id, factory_id, code, name) VALUES
  ('88888888-8888-8888-8888-888888888801', '22222222-2222-2222-2222-222222222201', 'STY-POLO-01', 'Classic Polo T-Shirt'),
  ('88888888-8888-8888-8888-888888888802', '22222222-2222-2222-2222-222222222201', 'STY-CHINO-02', 'Slim Fit Chino'),
  ('88888888-8888-8888-8888-888888888803', '22222222-2222-2222-2222-222222222202', 'STY-DRESS-03', 'Summer Midi Dress')
ON CONFLICT (factory_id, code) DO NOTHING;

INSERT INTO public.garment_measurement_specs (style_id, size, point, minimum_mm, maximum_mm) VALUES
  ('88888888-8888-8888-8888-888888888801', 'M', 'Chest Width', 510, 530),
  ('88888888-8888-8888-8888-888888888801', 'M', 'Body Length', 700, 720),
  ('88888888-8888-8888-8888-888888888801', 'L', 'Chest Width', 530, 550)
ON CONFLICT DO NOTHING;

INSERT INTO public.storage_locations (id, factory_id, code, name) VALUES
  ('99999999-9999-9999-9999-999999999901', '22222222-2222-2222-2222-222222222201', 'LOC-RAW-A1', 'Main Fabric Warehouse A1'),
  ('99999999-9999-9999-9999-999999999902', '22222222-2222-2222-2222-222222222201', 'LOC-WIP-L1', 'Line 1 Cut-Stock Buffer Bay'),
  ('99999999-9999-9999-9999-999999999903', '22222222-2222-2222-2222-222222222201', 'LOC-FG-BAY1', 'Finished Goods Dispatch Bay 1'),
  ('99999999-9999-9999-9999-999999999904', '22222222-2222-2222-2222-222222222202', 'LOC-RAW-B1', 'Bengaluru Fabric Store B1')
ON CONFLICT (factory_id, code) DO NOTHING;

-- 4. Specialized Masters (Phase 2)
INSERT INTO public.cutting_masters (factory_id, code, name, phone, specialization) VALUES
  ('22222222-2222-2222-2222-222222222201', 'CM-01', 'Selvamani K.', '+91-9842200101', 'Knit & Polo'),
  ('22222222-2222-2222-2222-222222222201', 'CM-02', 'Baskaran R.', '+91-9842200102', 'Woven Twill')
ON CONFLICT (factory_id, code) DO NOTHING;

INSERT INTO public.contacts (factory_id, code, name, contact_type, phone, email, company) VALUES
  ('22222222-2222-2222-2222-222222222201', 'CNT-01', 'Arvind Logistics', 'logistics', '+91-9842200201', 'dispatch@arvindlog.example', 'Arvind Freight'),
  ('22222222-2222-2222-2222-222222222201', 'CNT-02', 'KPR Mills Yarn', 'supplier', '+91-9842200202', 'orders@kpr.example', 'KPR Mills')
ON CONFLICT (factory_id, code) DO NOTHING;

INSERT INTO public.ranks (factory_id, code, name, level_order, base_rate) VALUES
  ('22222222-2222-2222-2222-222222222201', 'GR-A', 'Grade A Senior Tailor', 1, 750.00),
  ('22222222-2222-2222-2222-222222222201', 'GR-B', 'Grade B Operator', 2, 580.00)
ON CONFLICT (factory_id, code) DO NOTHING;

INSERT INTO public.tailor_mappings (factory_id, line_id, operator_name, employee_id, operation_name, machine_code, target_pace, actual_pace, status) VALUES
  ('22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'Kavitha Selvam', 'EMP-OP01', 'Collar Band & Attach', 'M-L1-01', 45, 48, 'optimal'),
  ('22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 'Devi Saravanan', 'EMP-OP02', 'Front Placket Stitch', 'M-L1-02', 45, 31, 'slow')
ON CONFLICT (factory_id, machine_code) DO NOTHING;

INSERT INTO public.configurations (factory_id, config_key, config_value, description) VALUES
  ('22222222-2222-2222-2222-222222222201', 'shift_working_minutes', '480', 'Standard 8-hour shift working minutes'),
  ('22222222-2222-2222-2222-222222222201', 'qc_rework_alert_threshold', '15', 'Rework backlog threshold for bottleneck alert')
ON CONFLICT (factory_id, config_key) DO NOTHING;

-- 5. SAM, Workforce & Calendar (Phase 6)
INSERT INTO public.sam_plans (factory_id, style_id, operation_breakdown, total_sam, target_pcs_per_hour) VALUES
  ('22222222-2222-2222-2222-222222222201', '88888888-8888-8888-8888-888888888801', '{"front":4.2,"collar":2.8,"sleeve":3.4,"hem":1.5,"assembly":2.6}', 14.50, 4),
  ('22222222-2222-2222-2222-222222222201', '88888888-8888-8888-8888-888888888802', '{"front":5.0,"collar":0,"sleeve":0,"hem":2.5,"assembly":6.5}', 14.00, 4)
ON CONFLICT (factory_id, style_id) DO NOTHING;

INSERT INTO public.workforce_plans (factory_id, line_id, planned_operators, present_operators, helpers_count, shift_minutes, efficiency_percent) VALUES
  ('22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555501', 24, 23, 4, 480, 82.00),
  ('22222222-2222-2222-2222-222222222201', '55555555-5555-5555-5555-555555555502', 26, 22, 3, 480, 74.00)
ON CONFLICT (factory_id, line_id) DO NOTHING;

-- 6. Raw Material Catalog (Phase 5)
INSERT INTO public.raw_materials (organization_id, sku, name, base_unit) VALUES
  ('11111111-1111-1111-1111-111111111111', 'FAB-COT-220', '220GSM Combed Cotton Pique', 'gram'),
  ('11111111-1111-1111-1111-111111111111', 'BTN-14MM', '14mm 4-Hole Pearl Button', 'piece')
ON CONFLICT (organization_id, sku) DO NOTHING;

-- 7. Jobs, Variant Allocations & Production Routes
INSERT INTO public.jobs (id, factory_id, buyer_id, style_id, line_id, job_code, order_quantity, status, start_date, target_date, colors, sizes) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', '22222222-2222-2222-2222-222222222201', '77777777-7777-7777-7777-777777777701', '88888888-8888-8888-8888-888888888801', '55555555-5555-5555-5555-555555555501', 'JOB-1001', 400, 'active', '2026-11-20', '2026-12-05', ARRAY['Navy','White'], ARRAY['M','L']),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02', '22222222-2222-2222-2222-222222222201', '77777777-7777-7777-7777-777777777702', '88888888-8888-8888-8888-888888888802', '55555555-5555-5555-5555-555555555502', 'JOB-1002', 300, 'active', '2026-11-22', '2026-12-10', ARRAY['Khaki'], ARRAY['M','L']),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03', '22222222-2222-2222-2222-222222222201', '77777777-7777-7777-7777-777777777701', '88888888-8888-8888-8888-888888888801', '55555555-5555-5555-5555-555555555501', 'JOB-1003', 200, 'draft', '2026-11-26', '2026-12-15', ARRAY['Navy'], ARRAY['M'])
ON CONFLICT (factory_id, job_code) DO NOTHING;

INSERT INTO public.job_items (job_id, size, color, quantity) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'M', 'Navy', 100),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'M', 'White', 100),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'L', 'Navy', 100),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 'L', 'White', 100),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02', 'M', 'Khaki', 150),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02', 'L', 'Khaki', 150),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa03', 'M', 'Navy', 200)
ON CONFLICT DO NOTHING;

INSERT INTO public.job_route_steps (job_id, ordinal, stage_code, line_id, role_code) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 1, 'sewing-out', '55555555-5555-5555-5555-555555555501', 'operator'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 2, 'kaja', '55555555-5555-5555-5555-555555555501', 'operator'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', 3, 'ironing', '55555555-5555-5555-5555-555555555501', 'operator'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02', 1, 'sewing-out', '55555555-5555-5555-5555-555555555502', 'operator'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa02', 2, 'ironing', '55555555-5555-5555-5555-555555555502', 'operator')
ON CONFLICT DO NOTHING;

-- 8. Employee Enrollment Roster (Ready for 7-role registration)
INSERT INTO public.employee_enrollment (organization_id, employee_id, factory_id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'EMP-MD01', '22222222-2222-2222-2222-222222222201', 'md@stitchflow.dev'),
  ('11111111-1111-1111-1111-111111111111', 'EMP-FM01', '22222222-2222-2222-2222-222222222201', 'fm@stitchflow.dev'),
  ('11111111-1111-1111-1111-111111111111', 'EMP-SUP01', '22222222-2222-2222-2222-222222222201', 'supervisor@stitchflow.dev'),
  ('11111111-1111-1111-1111-111111111111', 'EMP-OP01', '22222222-2222-2222-2222-222222222201', 'operator@stitchflow.dev'),
  ('11111111-1111-1111-1111-111111111111', 'EMP-QC01', '22222222-2222-2222-2222-222222222201', 'qc@stitchflow.dev'),
  ('11111111-1111-1111-1111-111111111111', 'EMP-STR01', '22222222-2222-2222-2222-222222222201', 'store@stitchflow.dev'),
  ('11111111-1111-1111-1111-111111111111', 'EMP-PCK01', '22222222-2222-2222-2222-222222222201', 'packing@stitchflow.dev')
ON CONFLICT DO NOTHING;

COMMIT;

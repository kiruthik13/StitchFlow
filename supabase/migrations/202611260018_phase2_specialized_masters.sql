
BEGIN;


CREATE TABLE public.cutting_masters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  code text NOT NULL CHECK (length(btrim(code)) BETWEEN 1 AND 48),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  phone text CHECK (phone IS NULL OR length(btrim(phone)) <= 32),
  specialization text CHECK (specialization IS NULL OR length(btrim(specialization)) <= 120),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (factory_id, id),
  UNIQUE (factory_id, code)
);

CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  code text NOT NULL CHECK (length(btrim(code)) BETWEEN 1 AND 48),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  contact_type text NOT NULL DEFAULT 'other' CHECK (contact_type IN ('buyer', 'supplier', 'logistics', 'internal', 'other')),
  phone text CHECK (phone IS NULL OR length(btrim(phone)) <= 32),
  email text CHECK (email IS NULL OR length(btrim(email)) <= 160),
  company text CHECK (company IS NULL OR length(btrim(company)) <= 160),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (factory_id, id),
  UNIQUE (factory_id, code)
);

CREATE TABLE public.ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  code text NOT NULL CHECK (length(btrim(code)) BETWEEN 1 AND 48),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  level_order integer NOT NULL DEFAULT 1 CHECK (level_order BETWEEN 1 AND 100),
  base_rate numeric(10, 2) NOT NULL DEFAULT 0 CHECK (base_rate >= 0),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (factory_id, id),
  UNIQUE (factory_id, code)
);

CREATE TABLE public.tailor_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  line_id uuid NOT NULL,
  operator_name text NOT NULL CHECK (length(btrim(operator_name)) BETWEEN 1 AND 160),
  employee_id text CHECK (employee_id IS NULL OR length(btrim(employee_id)) <= 64),
  operation_name text NOT NULL CHECK (length(btrim(operation_name)) BETWEEN 1 AND 160),
  machine_code text NOT NULL CHECK (length(btrim(machine_code)) BETWEEN 1 AND 48),
  target_pace integer NOT NULL DEFAULT 40 CHECK (target_pace BETWEEN 1 AND 10000),
  actual_pace integer NOT NULL DEFAULT 0 CHECK (actual_pace >= 0 AND actual_pace <= 10000),
  status text NOT NULL DEFAULT 'optimal' CHECK (status IN ('optimal', 'slow', 'inactive')),
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (factory_id, machine_code),
  FOREIGN KEY (factory_id, line_id) REFERENCES public.production_lines(factory_id, id)
);

CREATE TABLE public.configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  config_key text NOT NULL CHECK (length(btrim(config_key)) BETWEEN 1 AND 80),
  config_value text NOT NULL CHECK (length(config_value) <= 1000),
  description text CHECK (description IS NULL OR length(btrim(description)) <= 300),
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (factory_id, config_key)
);

ALTER TABLE public.cutting_masters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tailor_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.cutting_masters, public.contacts, public.ranks, public.tailor_mappings, public.configurations FROM PUBLIC, anon, authenticated;

COMMIT;

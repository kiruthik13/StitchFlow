BEGIN;

CREATE TABLE public.sam_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  style_id uuid NOT NULL REFERENCES public.garment_styles(id),
  operation_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_sam numeric(8, 2) NOT NULL CHECK (total_sam > 0),
  target_pcs_per_hour integer NOT NULL CHECK (target_pcs_per_hour >= 0),
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (factory_id, style_id)
);

CREATE TABLE public.workforce_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  line_id uuid NOT NULL REFERENCES public.production_lines(id),
  planned_operators integer NOT NULL CHECK (planned_operators BETWEEN 1 AND 5000),
  present_operators integer NOT NULL CHECK (present_operators BETWEEN 0 AND 5000),
  helpers_count integer NOT NULL DEFAULT 0 CHECK (helpers_count BETWEEN 0 AND 2000),
  shift_minutes integer NOT NULL DEFAULT 480 CHECK (shift_minutes BETWEEN 60 AND 1440),
  efficiency_percent numeric(5, 2) NOT NULL DEFAULT 80 CHECK (efficiency_percent BETWEEN 1 AND 150),
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (factory_id, line_id)
);

CREATE TABLE public.factory_calendar_holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  holiday_date date NOT NULL,
  reason text CHECK (reason IS NULL OR length(btrim(reason)) <= 200),
  UNIQUE (factory_id, holiday_date)
);

ALTER TABLE public.sam_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workforce_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_calendar_holidays ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.sam_plans, public.workforce_plans, public.factory_calendar_holidays FROM PUBLIC, anon, authenticated;

COMMIT;

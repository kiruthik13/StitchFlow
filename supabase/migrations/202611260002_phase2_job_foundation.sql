BEGIN;

CREATE TABLE public.buyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  code text NOT NULL CHECK (length(btrim(code)) BETWEEN 1 AND 48),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (factory_id, id),
  UNIQUE (factory_id, code)
);

CREATE TABLE public.garment_styles (
  LIKE public.buyers INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES,
  FOREIGN KEY (factory_id) REFERENCES public.factories(id)
);

ALTER TABLE public.production_lines ADD UNIQUE (factory_id, id);

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  buyer_id uuid NOT NULL,
  style_id uuid NOT NULL,
  line_id uuid NOT NULL,
  job_code text NOT NULL CHECK (length(btrim(job_code)) BETWEEN 1 AND 48),
  order_quantity integer NOT NULL CHECK (order_quantity BETWEEN 1 AND 100000000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'on-hold', 'completed', 'closed', 'cancelled')),
  start_date date NOT NULL,
  target_date date NOT NULL CHECK (target_date >= start_date),
  colors text[] NOT NULL CHECK (cardinality(colors) BETWEEN 1 AND 40),
  sizes text[] NOT NULL CHECK (cardinality(sizes) BETWEEN 1 AND 40),
  UNIQUE (factory_id, job_code),
  FOREIGN KEY (factory_id, buyer_id) REFERENCES public.buyers(factory_id, id),
  FOREIGN KEY (factory_id, style_id) REFERENCES public.garment_styles(factory_id, id),
  FOREIGN KEY (factory_id, line_id) REFERENCES public.production_lines(factory_id, id)
);

CREATE INDEX jobs_factory_id_cursor ON public.jobs (factory_id, id);
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garment_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.buyers, public.garment_styles, public.jobs FROM anon, authenticated;

COMMIT;

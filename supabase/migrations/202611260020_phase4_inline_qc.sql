BEGIN;

CREATE TABLE public.inline_qc_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  line_id uuid REFERENCES public.production_lines(id),
  bundle_id uuid REFERENCES public.bundles(id),
  station_name text NOT NULL CHECK (length(btrim(station_name)) BETWEEN 1 AND 160),
  operator_name text NOT NULL CHECK (length(btrim(operator_name)) BETWEEN 1 AND 160),
  sample_qty integer NOT NULL CHECK (sample_qty BETWEEN 1 AND 1000),
  defect_qty integer NOT NULL DEFAULT 0 CHECK (defect_qty >= 0 AND defect_qty <= sample_qty),
  defect_notes text CHECK (defect_notes IS NULL OR length(btrim(defect_notes)) <= 500),
  status text NOT NULL CHECK (status IN ('pass', 'alert')),
  inspector_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inline_qc_audits_factory_idx ON public.inline_qc_audits (factory_id, created_at DESC);

ALTER TABLE public.inline_qc_audits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inline_qc_audits FROM PUBLIC, anon, authenticated;

COMMIT;

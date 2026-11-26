BEGIN;
CREATE TABLE public.cut_stock_discrepancy_returns (
  handover_id uuid PRIMARY KEY REFERENCES public.cut_stock_handovers(id),
  verified_quantity integer NOT NULL CHECK (verified_quantity BETWEEN 1 AND 100000000),
  verified_by uuid NOT NULL REFERENCES public.profiles(id),
  verified_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 500),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  CHECK ((approved_by IS NULL AND approved_at IS NULL) OR
    (approved_by IS NOT NULL AND approved_at IS NOT NULL AND approved_by <> verified_by))
);
ALTER TABLE public.cut_stock_discrepancy_returns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cut_stock_discrepancy_returns FROM PUBLIC, anon, authenticated;
COMMIT;

BEGIN;
CREATE TABLE public.raw_transfer_discrepancies (
  transfer_id uuid PRIMARY KEY REFERENCES public.raw_material_transfers(id),
  observed_quantity integer NOT NULL CHECK (observed_quantity >= 0),
  reported_by uuid NOT NULL REFERENCES public.profiles(id),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 160),
  reported_at timestamptz NOT NULL DEFAULT now(),
  returned_by uuid REFERENCES public.profiles(id),
  returned_at timestamptz,
  CHECK ((returned_by IS NULL AND returned_at IS NULL) OR
    (returned_by IS NOT NULL AND returned_at IS NOT NULL AND returned_by <> reported_by))
);
ALTER TABLE public.raw_transfer_discrepancies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.raw_transfer_discrepancies FROM PUBLIC, anon, authenticated;
ALTER TABLE public.raw_material_movements DROP CONSTRAINT raw_material_movements_movement_check;
ALTER TABLE public.raw_material_movements ADD CONSTRAINT raw_material_movements_movement_check
  CHECK (movement IN ('receipt','issue','transfer-out','transfer-in','adjust-in','adjust-out','transfer-return'));
ALTER TABLE public.raw_material_movements DROP CONSTRAINT raw_material_movement_reference_check;
ALTER TABLE public.raw_material_movements ADD CONSTRAINT raw_material_movement_reference_check
  CHECK ((movement IN ('receipt','issue','adjust-in','adjust-out') AND transfer_id IS NULL AND request_id IS NOT NULL)
    OR (movement IN ('transfer-out','transfer-in','transfer-return') AND transfer_id IS NOT NULL AND request_id IS NULL));
COMMIT;

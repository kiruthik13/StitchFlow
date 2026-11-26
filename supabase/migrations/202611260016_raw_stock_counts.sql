BEGIN;
ALTER TABLE public.raw_material_movements DROP CONSTRAINT raw_material_movements_movement_check;
ALTER TABLE public.raw_material_movements ADD CONSTRAINT raw_material_movements_movement_check
  CHECK (movement IN ('receipt','issue','transfer-out','transfer-in','adjust-in','adjust-out'));
ALTER TABLE public.raw_material_movements DROP CONSTRAINT raw_material_movements_check;
ALTER TABLE public.raw_material_movements ADD CONSTRAINT raw_material_movement_reference_check
  CHECK ((movement IN ('receipt','issue','adjust-in','adjust-out') AND transfer_id IS NULL AND request_id IS NOT NULL)
    OR (movement IN ('transfer-out','transfer-in') AND transfer_id IS NOT NULL AND request_id IS NULL));
CREATE TABLE public.raw_stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.raw_materials(id),
  location_id uuid NOT NULL REFERENCES public.storage_locations(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  request_id uuid NOT NULL,
  observed_quantity integer NOT NULL CHECK (observed_quantity >= 0),
  expected_quantity bigint NOT NULL CHECK (expected_quantity >= 0),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 160),
  counted_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  UNIQUE (actor_id, request_id),
  CHECK ((approved_by IS NULL AND approved_at IS NULL) OR
    (approved_by IS NOT NULL AND approved_by <> actor_id AND approved_at IS NOT NULL))
);
ALTER TABLE public.raw_stock_counts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.raw_stock_counts FROM PUBLIC, anon, authenticated;
COMMIT;

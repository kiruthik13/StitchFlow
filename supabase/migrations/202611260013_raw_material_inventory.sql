BEGIN;
CREATE TABLE public.raw_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  sku text NOT NULL CHECK (length(btrim(sku)) BETWEEN 1 AND 48),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  base_unit text NOT NULL CHECK (base_unit IN ('piece','millimeter','gram')),
  UNIQUE (organization_id, sku)
);
CREATE TABLE public.raw_material_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.raw_materials(id),
  source_location_id uuid NOT NULL REFERENCES public.storage_locations(id),
  destination_location_id uuid NOT NULL REFERENCES public.storage_locations(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  request_id uuid NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  receiver_id uuid REFERENCES public.profiles(id),
  received_at timestamptz,
  UNIQUE (sender_id, request_id),
  CHECK (source_location_id <> destination_location_id),
  CHECK ((receiver_id IS NULL AND received_at IS NULL)
    OR (receiver_id IS NOT NULL AND receiver_id <> sender_id AND received_at IS NOT NULL))
);
CREATE TABLE public.raw_material_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid NOT NULL REFERENCES public.raw_materials(id),
  location_id uuid NOT NULL REFERENCES public.storage_locations(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  request_id uuid,
  transfer_id uuid REFERENCES public.raw_material_transfers(id),
  movement text NOT NULL CHECK (movement IN ('receipt','issue','transfer-out','transfer-in')),
  quantity integer NOT NULL CHECK (quantity > 0),
  reference text NOT NULL CHECK (length(btrim(reference)) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, request_id),
  UNIQUE (transfer_id, movement),
  CHECK ((movement IN ('receipt','issue') AND transfer_id IS NULL AND request_id IS NOT NULL)
    OR (movement IN ('transfer-out','transfer-in') AND transfer_id IS NOT NULL AND request_id IS NULL))
);
CREATE INDEX raw_material_stock ON public.raw_material_movements (material_id, location_id);
CREATE INDEX raw_material_location_history ON public.raw_material_movements (location_id, id);
ALTER TABLE public.raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_material_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raw_material_movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.raw_materials, public.raw_material_transfers, public.raw_material_movements FROM PUBLIC, anon, authenticated;
CREATE TRIGGER raw_material_movement_history BEFORE UPDATE OR DELETE ON public.raw_material_movements
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();
COMMIT;

BEGIN;
CREATE TABLE public.storage_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  code text NOT NULL CHECK (length(btrim(code)) BETWEEN 1 AND 48),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 160),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (factory_id, code)
);

CREATE TABLE public.cut_stock_handovers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id),
  location_id uuid NOT NULL REFERENCES public.storage_locations(id),
  destination_line_id uuid REFERENCES public.production_lines(id),
  direction text NOT NULL CHECK (direction IN ('output-in', 'output-out')),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 100000000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'rejected')),
  sender_id uuid NOT NULL REFERENCES public.profiles(id),
  request_id uuid NOT NULL,
  receiver_id uuid REFERENCES public.profiles(id),
  received_quantity integer CHECK (received_quantity BETWEEN 0 AND 100000000),
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  UNIQUE (sender_id, request_id),
  CHECK ((direction = 'output-out') = (destination_line_id IS NOT NULL)),
  CHECK (receiver_id IS NULL OR receiver_id <> sender_id),
  CHECK (
    (status = 'pending' AND receiver_id IS NULL AND decided_at IS NULL AND received_quantity IS NULL)
    OR (status = 'received' AND receiver_id IS NOT NULL AND decided_at IS NOT NULL
        AND received_quantity IS NOT NULL AND received_quantity = quantity)
    OR (status = 'rejected' AND receiver_id IS NOT NULL AND decided_at IS NOT NULL
        AND received_quantity IS NOT NULL AND length(btrim(coalesce(decision_reason, ''))) > 0)
  )
);
CREATE INDEX cut_stock_bundle_location ON public.cut_stock_handovers(bundle_id, location_id);
CREATE INDEX cut_stock_location_pending ON public.cut_stock_handovers(location_id, id) WHERE status = 'pending';
ALTER TABLE public.storage_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cut_stock_handovers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.storage_locations, public.cut_stock_handovers FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.protect_cut_stock_handover()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' OR OLD.status <> 'pending' OR NEW.status = 'pending'
    OR (NEW.id, NEW.bundle_id, NEW.location_id, NEW.destination_line_id, NEW.direction,
        NEW.quantity, NEW.sender_id, NEW.request_id, NEW.created_at)
       IS DISTINCT FROM
       (OLD.id, OLD.bundle_id, OLD.location_id, OLD.destination_line_id, OLD.direction,
        OLD.quantity, OLD.sender_id, OLD.request_id, OLD.created_at)
  THEN
    RAISE EXCEPTION 'Handover history cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_cut_stock_handover() FROM PUBLIC;
CREATE TRIGGER cut_stock_handover_history BEFORE UPDATE OR DELETE ON public.cut_stock_handovers
FOR EACH ROW EXECUTE FUNCTION public.protect_cut_stock_handover();
COMMIT;

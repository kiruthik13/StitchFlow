BEGIN;
CREATE TABLE public.shipment_manifests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factory_id uuid NOT NULL REFERENCES public.factories(id),
  carrier text NOT NULL CHECK (length(btrim(carrier)) BETWEEN 1 AND 140),
  vehicle text NOT NULL CHECK (length(btrim(vehicle)) BETWEEN 1 AND 60),
  seal text NOT NULL CHECK (length(btrim(seal)) BETWEEN 1 AND 60),
  destination text NOT NULL CHECK (length(btrim(destination)) BETWEEN 1 AND 160),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  request_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES public.profiles(id),
  approved_at timestamptz,
  dispatched_by uuid REFERENCES public.profiles(id),
  dispatched_at timestamptz,
  gate_pass uuid UNIQUE,
  UNIQUE (created_by, request_id),
  CHECK ((approved_by IS NULL AND approved_at IS NULL) OR
    (approved_by IS NOT NULL AND approved_by <> created_by AND approved_at IS NOT NULL)),
  CHECK ((dispatched_by IS NULL AND dispatched_at IS NULL AND gate_pass IS NULL) OR
    (dispatched_by IS NOT NULL AND approved_by IS NOT NULL AND dispatched_by <> approved_by
      AND dispatched_at IS NOT NULL AND gate_pass IS NOT NULL))
);
CREATE TABLE public.shipment_manifest_cartons (
  manifest_id uuid NOT NULL REFERENCES public.shipment_manifests(id),
  carton_id uuid PRIMARY KEY REFERENCES public.bundle_cartons(id)
);
CREATE INDEX shipment_cartons_manifest ON public.shipment_manifest_cartons(manifest_id);
ALTER TABLE public.shipment_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_manifest_cartons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.shipment_manifests, public.shipment_manifest_cartons FROM PUBLIC, anon, authenticated;
CREATE TRIGGER shipment_manifest_carton_history BEFORE UPDATE OR DELETE ON public.shipment_manifest_cartons
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();
CREATE OR REPLACE FUNCTION stitchflow_internal.notify_factory_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.factory_id IS NOT NULL AND NEW.result = 'success' AND NEW.action = ANY(ARRAY[
    'JOB_CREATED', 'JOB_APPROVAL_DECIDED', 'JOB_STATUS_CHANGED', 'CUTTING_OUTPUT_RECORDED',
    'CUT_STOCK_HANDOVER_SENT', 'CUT_STOCK_HANDOVER_DECIDED', 'CUT_STOCK_RETURN_APPROVED', 'STAGE_COMPLETED',
    'QUALITY_INSPECTION', 'QUALITY_REWORK', 'QUALITY_REINSPECTION', 'QUALITY_RELEASE',
    'CARTON_PACKED', 'CARTON_RECEIVED_BY_STORE', 'CARTON_DISPATCH_APPROVED', 'CARTON_DISPATCHED',
    'RAW_MATERIAL_RECEIPT', 'RAW_MATERIAL_ISSUE', 'RAW_TRANSFER_SENT', 'RAW_TRANSFER_INBOUND', 'RAW_TRANSFER_RECEIVED', 'RAW_TRANSFER_DISCREPANCY', 'RAW_TRANSFER_RETURNED',
    'SHIPMENT_CREATED', 'SHIPMENT_APPROVED', 'SHIPMENT_DISPATCHED', 'RAW_COUNT_SUBMITTED', 'RAW_COUNT_APPROVED'
  ]) THEN
    PERFORM realtime.send('{}'::jsonb, 'factory_changed', 'stitchflow:factory:' || NEW.factory_id::text, true);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'StitchFlow factory notification could not be sent';
  RETURN NEW;
END;
$$;
COMMIT;

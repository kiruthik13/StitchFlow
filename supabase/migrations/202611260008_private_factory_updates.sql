BEGIN;
CREATE POLICY stitchflow_factory_updates ON realtime.messages
FOR SELECT TO authenticated
USING (
  extension = 'broadcast'
  AND public.current_user_role() IN ('md', 'factory-manager', 'store-dispatch')
  AND public.has_factory_access(
    CASE WHEN (SELECT realtime.topic()) ~ '^stitchflow:factory:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN split_part((SELECT realtime.topic()), ':', 3)::uuid ELSE NULL END
  )
);

CREATE SCHEMA IF NOT EXISTS stitchflow_internal;
REVOKE ALL ON SCHEMA stitchflow_internal FROM PUBLIC;
CREATE FUNCTION stitchflow_internal.notify_factory_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.factory_id IS NOT NULL AND NEW.result = 'success' AND NEW.action = ANY(ARRAY[
    'JOB_CREATED', 'JOB_APPROVAL_DECIDED', 'JOB_STATUS_CHANGED', 'CUTTING_OUTPUT_RECORDED',
    'CUT_STOCK_HANDOVER_SENT', 'CUT_STOCK_HANDOVER_DECIDED', 'STAGE_COMPLETED',
    'QUALITY_INSPECTION', 'QUALITY_REWORK', 'QUALITY_REINSPECTION', 'QUALITY_RELEASE',
    'CARTON_PACKED', 'CARTON_RECEIVED_BY_STORE', 'CARTON_DISPATCH_APPROVED', 'CARTON_DISPATCHED'
  ]) THEN
    PERFORM realtime.send('{}'::jsonb, 'factory_changed', 'stitchflow:factory:' || NEW.factory_id::text, true);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'StitchFlow factory notification could not be sent';
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION stitchflow_internal.notify_factory_activity() FROM PUBLIC;
CREATE TRIGGER stitchflow_factory_activity_notification AFTER INSERT ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION stitchflow_internal.notify_factory_activity();
COMMIT;

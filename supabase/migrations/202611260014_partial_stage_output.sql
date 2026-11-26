BEGIN;
ALTER TABLE public.bundle_stage_events DROP CONSTRAINT bundle_stage_events_bundle_id_step_id_key;
ALTER TABLE public.bundle_stage_events ADD COLUMN client_occurred_at timestamptz;
ALTER TABLE public.cutting_output_events ADD COLUMN client_occurred_at timestamptz;
CREATE INDEX bundle_stage_event_progress ON public.bundle_stage_events(bundle_id, step_id);

CREATE VIEW public.bundle_route_progress WITH (security_invoker = true) AS
SELECT b.id AS bundle_id, s.id AS step_id, s.ordinal, s.stage_code,
  COALESCE(done.quantity, 0)::integer AS completed,
  CASE WHEN COALESCE(done.quantity,0) = b.quantity THEN done.last_at END AS completed_at,
  GREATEST(0, LEAST(b.quantity, CASE WHEN prior.id IS NULL THEN COALESCE(receipt.quantity, 0)
    ELSE COALESCE(previous.quantity, 0) END) - COALESCE(done.quantity, 0))::integer AS available
FROM public.bundles b JOIN public.job_route_steps s ON s.job_id = b.job_id
LEFT JOIN LATERAL (
  SELECT preceding.id FROM public.job_route_steps preceding WHERE preceding.job_id = b.job_id
    AND preceding.ordinal < s.ordinal ORDER BY preceding.ordinal DESC LIMIT 1
) prior ON true
LEFT JOIN LATERAL (
  SELECT SUM(e.quantity) AS quantity, MAX(e.created_at) AS last_at
  FROM public.bundle_stage_events e WHERE e.bundle_id = b.id AND e.step_id = s.id
) done ON true
LEFT JOIN LATERAL (
  SELECT SUM(e.quantity) AS quantity FROM public.bundle_stage_events e
  WHERE e.bundle_id = b.id AND e.step_id = prior.id
) previous ON prior.id IS NOT NULL
LEFT JOIN LATERAL (
  SELECT SUM(h.quantity) AS quantity FROM public.cut_stock_handovers h
  WHERE h.bundle_id = b.id AND h.direction = 'output-out' AND h.status = 'received'
    AND h.destination_line_id = s.line_id
) receipt ON prior.id IS NULL;
REVOKE ALL ON public.bundle_route_progress FROM PUBLIC, anon, authenticated;
COMMIT;

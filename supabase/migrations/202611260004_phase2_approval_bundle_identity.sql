BEGIN;

CREATE TABLE public.job_approvals (
  job_id uuid PRIMARY KEY REFERENCES public.jobs(id),
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected')),
  decided_by uuid NOT NULL REFERENCES public.profiles(id),
  reason text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  CHECK (decision <> 'rejected' OR length(btrim(coalesce(reason, ''))) > 0)
);

CREATE TABLE public.bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  request_id uuid NOT NULL,
  barcode text NOT NULL UNIQUE DEFAULT ('BND-' || replace(gen_random_uuid()::text, '-', '')),
  size text NOT NULL,
  color text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 100000000),
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, request_id)
);

CREATE TABLE public.tag_print_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id),
  request_id uuid NOT NULL,
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bundle_id, request_id)
);
ALTER TABLE public.job_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tag_print_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_approvals, public.bundles, public.tag_print_logs FROM anon, authenticated;
CREATE TRIGGER tag_print_logs_immutable BEFORE UPDATE OR DELETE ON public.tag_print_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

COMMIT;

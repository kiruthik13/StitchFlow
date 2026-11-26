BEGIN;
CREATE TABLE public.job_close_policies (
  job_id uuid PRIMARY KEY REFERENCES public.jobs(id),
  max_rejected_quantity integer NOT NULL CHECK (max_rejected_quantity BETWEEN 0 AND 100000000),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 500),
  configured_by uuid NOT NULL REFERENCES public.profiles(id),
  configured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_close_policies ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_close_policies FROM PUBLIC, anon, authenticated;
COMMIT;

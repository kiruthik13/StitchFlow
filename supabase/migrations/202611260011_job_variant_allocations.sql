BEGIN;
CREATE TABLE public.job_items (
  job_id uuid NOT NULL REFERENCES public.jobs(id),
  size text NOT NULL CHECK (length(btrim(size)) BETWEEN 1 AND 32),
  color text NOT NULL CHECK (length(btrim(color)) BETWEEN 1 AND 32),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 100000000),
  PRIMARY KEY (job_id, size, color)
);
ALTER TABLE public.job_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.job_items FROM PUBLIC, anon, authenticated;
CREATE TRIGGER job_items_immutable BEFORE UPDATE OR DELETE ON public.job_items
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();
COMMIT;

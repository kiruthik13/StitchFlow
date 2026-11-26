BEGIN;
CREATE TABLE public.garment_measurement_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  style_id uuid NOT NULL REFERENCES public.garment_styles(id),
  size text NOT NULL CHECK (length(btrim(size)) BETWEEN 1 AND 32),
  point text NOT NULL CHECK (length(btrim(point)) BETWEEN 1 AND 80),
  minimum_mm numeric(9,2) NOT NULL CHECK (minimum_mm >= 0),
  maximum_mm numeric(9,2) NOT NULL CHECK (maximum_mm >= minimum_mm),
  UNIQUE (style_id, size, point)
);
CREATE TABLE public.bundle_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id),
  spec_id uuid NOT NULL REFERENCES public.garment_measurement_specs(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  request_id uuid NOT NULL,
  measured_mm numeric(9,2) NOT NULL CHECK (measured_mm >= 0),
  within_tolerance boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, request_id)
);
CREATE TABLE public.bundle_quality_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.bundles(id),
  actor_id uuid NOT NULL REFERENCES public.profiles(id),
  request_id uuid NOT NULL,
  object_path text NOT NULL UNIQUE,
  content_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (actor_id, request_id)
);
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('stitchflow-qc-evidence', 'stitchflow-qc-evidence', false, 5242880, ARRAY['image/jpeg', 'image/png']);
CREATE POLICY stitchflow_qc_evidence_server_only ON storage.objects
AS RESTRICTIVE FOR ALL TO anon, authenticated
USING (bucket_id <> 'stitchflow-qc-evidence')
WITH CHECK (bucket_id <> 'stitchflow-qc-evidence');
ALTER TABLE public.garment_measurement_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_quality_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.garment_measurement_specs, public.bundle_measurements, public.bundle_quality_photos
FROM PUBLIC, anon, authenticated;
CREATE TRIGGER measurement_history BEFORE UPDATE OR DELETE ON public.bundle_measurements
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();
CREATE TRIGGER quality_photo_history BEFORE UPDATE OR DELETE ON public.bundle_quality_photos
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();
COMMIT;

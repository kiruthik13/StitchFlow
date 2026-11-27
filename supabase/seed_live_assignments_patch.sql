-- Idempotent live assignment & operational readiness patch for sample org (11111111-1111-1111-1111-111111111111)
-- 1. Assign Line 1 (55555555-5555-5555-5555-555555555501) to EMP-QC01 and EMP-PCK01 so requireDuty() passes for QC and Packing
UPDATE public.user_assignments
SET line_id = '55555555-5555-5555-5555-555555555501',
    updated_at = now()
WHERE profile_id IN (
  SELECT id FROM public.profiles WHERE employee_id IN ('EMP-QC01', 'EMP-PCK01')
)
  AND line_id IS NULL;

-- 2. Grant EMP-OP01 active rework duty on JOB-1001 so operator can complete rework pieces
INSERT INTO public.job_quality_assignments (job_id, assignment_id, duty)
SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', a.id, 'rework'
FROM public.user_assignments a
JOIN public.profiles p ON p.id = a.profile_id
WHERE p.employee_id = 'EMP-OP01' AND a.is_active = true
ON CONFLICT DO NOTHING;

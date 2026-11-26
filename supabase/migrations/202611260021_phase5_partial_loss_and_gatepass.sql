BEGIN;

ALTER TABLE public.raw_transfer_discrepancies
  ADD COLUMN IF NOT EXISTS recovered_quantity integer CHECK (recovered_quantity IS NULL OR recovered_quantity >= 0),
  ADD COLUMN IF NOT EXISTS loss_quantity integer CHECK (loss_quantity IS NULL OR loss_quantity >= 0),
  ADD COLUMN IF NOT EXISTS loss_reason text CHECK (loss_reason IS NULL OR length(btrim(loss_reason)) <= 500);

COMMIT;

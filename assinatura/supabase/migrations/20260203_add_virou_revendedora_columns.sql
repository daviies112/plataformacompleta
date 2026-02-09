-- Add virou_revendedora columns to contracts table for tracking when a client becomes a reseller
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS virou_revendedora BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS data_virou_revendedora TIMESTAMP WITH TIME ZONE;

-- Create index for faster lookups of resellers
CREATE INDEX IF NOT EXISTS idx_contracts_virou_revendedora ON public.contracts(virou_revendedora) WHERE virou_revendedora = TRUE;

COMMENT ON COLUMN public.contracts.virou_revendedora IS 'Indicates if the client has completed the full signature flow and became a reseller';
COMMENT ON COLUMN public.contracts.data_virou_revendedora IS 'Timestamp when the client completed the signature flow and became a reseller';

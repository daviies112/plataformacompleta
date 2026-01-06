-- Add client data columns to contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS client_name VARCHAR NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS client_cpf VARCHAR NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS client_email VARCHAR NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS client_phone VARCHAR;

-- Add unique access token for public URL
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS access_token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_contracts_access_token ON public.contracts(access_token);
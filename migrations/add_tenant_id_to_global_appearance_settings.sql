-- Migration: Add tenant_id column to global_appearance_settings
-- This enables multi-tenant isolation for signature page configurations
-- Run this SQL in each tenant's Supabase database

-- Add tenant_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'global_appearance_settings' 
    AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE global_appearance_settings 
    ADD COLUMN tenant_id TEXT;
    
    RAISE NOTICE 'Column tenant_id added to global_appearance_settings';
  ELSE
    RAISE NOTICE 'Column tenant_id already exists in global_appearance_settings';
  END IF;
END $$;

-- Create index on tenant_id for faster queries
CREATE INDEX IF NOT EXISTS idx_global_appearance_settings_tenant_id 
ON global_appearance_settings(tenant_id);

-- Optional: Update existing records to set default tenant_id
-- Only run this if you have existing data that needs migration
-- UPDATE global_appearance_settings 
-- SET tenant_id = 'default' 
-- WHERE tenant_id IS NULL;

COMMENT ON COLUMN global_appearance_settings.tenant_id IS 
  'Multi-tenant isolation: Each tenant has their own appearance settings';

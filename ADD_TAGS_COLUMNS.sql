-- Add tags column to store_products
ALTER TABLE store_products 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add target_tag to store_campaigns (for tag-based campaigns)
ALTER TABLE store_campaigns 
ADD COLUMN IF NOT EXISTS target_tag text;

-- Add target_tag to store_mosaics (optional, but good for UI state)
ALTER TABLE store_mosaics 
ADD COLUMN IF NOT EXISTS target_tag text;

-- Create index for faster tag filtering (Gin index for array)
CREATE INDEX IF NOT EXISTS idx_store_products_tags ON store_products USING GIN (tags);

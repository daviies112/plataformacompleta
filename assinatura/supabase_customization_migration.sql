-- SQL para executar no Supabase
-- Este SQL adiciona os campos de customização à tabela contracts

-- Adicionar coluna logo_url
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Adicionar coluna logo_size
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS logo_size VARCHAR(20) DEFAULT 'medium';

-- Adicionar coluna logo_position
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS logo_position VARCHAR(20) DEFAULT 'center';

-- Adicionar coluna primary_color
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7);

-- Adicionar coluna secondary_color
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(7);

-- Adicionar coluna font_family
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS font_family VARCHAR(100);

-- Adicionar coluna font_size
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS font_size VARCHAR(20);

-- Adicionar coluna company_name
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);

-- Adicionar coluna footer_text
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS footer_text TEXT;

-- Verificar se tudo foi criado corretamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'contracts'
ORDER BY ordinal_position;
-- =============================================================
-- SQL para garantir que a tabela 'companies' no Supabase
-- tenha TODAS as colunas necessárias para o sistema de branding
-- 
-- INSTRUÇÕES: Cole e execute este SQL no SQL Editor do Supabase
-- É seguro rodar múltiplas vezes (usa IF NOT EXISTS)
-- =============================================================

-- 1. Criar a tabela companies se não existir
CREATE TABLE IF NOT EXISTS companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT DEFAULT 'Minha Empresa',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Adicionar TODAS as colunas de branding (seguro - ignora se já existir)

-- Cores principais
ALTER TABLE companies ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#9b87f5';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '#7e69ab';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#d946ef';

-- Cores de fundo e texto
ALTER TABLE companies ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#ffffff';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT '#000000';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS heading_color TEXT DEFAULT '#1a1a1a';

-- Cores de botão
ALTER TABLE companies ADD COLUMN IF NOT EXISTS button_color TEXT DEFAULT '#9b87f5';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS button_text_color TEXT DEFAULT '#ffffff';

-- Cores da barra lateral (sidebar)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sidebar_background TEXT DEFAULT '#1a1a1a';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS sidebar_text TEXT DEFAULT '#ffffff';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS selected_item_color TEXT DEFAULT '#9b87f5';

-- Logo
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_size TEXT DEFAULT 'medium';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_position TEXT DEFAULT 'left';

-- Paleta de cores extraída do logo
ALTER TABLE companies ADD COLUMN IF NOT EXISTS color_palette TEXT[];

-- Timestamps de branding
ALTER TABLE companies ADD COLUMN IF NOT EXISTS branding_updated_at TIMESTAMPTZ;

-- 3. Criar bucket de storage para logos (ignorar erro se já existir)
-- NOTA: Isso precisa ser feito manualmente no painel Storage do Supabase
-- Crie um bucket chamado "company-logos" com acesso público

-- 4. Habilitar RLS (Row Level Security) - opcional mas recomendado
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Política para permitir leitura pública (para branding no login)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'allow_public_read_companies'
  ) THEN
    CREATE POLICY allow_public_read_companies ON companies FOR SELECT USING (true);
  END IF;
END $$;

-- Política para permitir update autenticado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'allow_authenticated_update_companies'
  ) THEN
    CREATE POLICY allow_authenticated_update_companies ON companies FOR UPDATE USING (true);
  END IF;
END $$;

-- Política para permitir insert autenticado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'allow_authenticated_insert_companies'
  ) THEN
    CREATE POLICY allow_authenticated_insert_companies ON companies FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 5. Verificar resultado
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'companies' 
ORDER BY ordinal_position;

-- Tabelas para salvar configurações de cada página no Supabase
-- Estas são tabelas estruturais que complementam os contracts

-- Aparência (Appearance configuration)
CREATE TABLE IF NOT EXISTS appearance_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  logo_url TEXT,
  logo_size VARCHAR(20) DEFAULT 'medium',
  logo_position VARCHAR(20) DEFAULT 'center',
  primary_color VARCHAR(7),
  text_color VARCHAR(7) DEFAULT '#333333',
  font_family VARCHAR(100),
  font_size VARCHAR(20),
  company_name VARCHAR(255),
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Verificação (Verification configuration)
CREATE TABLE IF NOT EXISTS verification_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  primary_color VARCHAR(7),
  text_color VARCHAR(7) DEFAULT '#000000',
  font_family VARCHAR(100),
  font_size VARCHAR(20),
  logo_url TEXT,
  logo_size VARCHAR(20),
  logo_position VARCHAR(20),
  footer_text TEXT,
  welcome_text VARCHAR(255),
  instructions TEXT,
  security_text TEXT,
  background_image TEXT,
  background_color VARCHAR(7) DEFAULT '#ffffff',
  icon_url TEXT,
  header_background_color VARCHAR(7) DEFAULT '#2c3e50',
  header_logo_url TEXT,
  header_company_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Contrato (Contract configuration)
CREATE TABLE IF NOT EXISTS contract_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  title VARCHAR(255),
  clauses JSONB,
  logo_url TEXT,
  logo_size VARCHAR(20),
  logo_position VARCHAR(20),
  primary_color VARCHAR(7),
  text_color VARCHAR(7),
  font_family VARCHAR(100),
  font_size VARCHAR(20),
  company_name VARCHAR(255),
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progresso (Progress Tracker configuration)
CREATE TABLE IF NOT EXISTS progress_tracker_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  card_color VARCHAR(7) DEFAULT '#dbeafe',
  button_color VARCHAR(7) DEFAULT '#22c55e',
  text_color VARCHAR(7) DEFAULT '#1e40af',
  title VARCHAR(100) DEFAULT 'Assinatura Digital',
  subtitle TEXT,
  step1_title VARCHAR(255),
  step1_description TEXT,
  step2_title VARCHAR(255),
  step2_description TEXT,
  step3_title VARCHAR(255),
  step3_description TEXT,
  button_text VARCHAR(255),
  font_family VARCHAR(100),
  font_size VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parabéns / Revendedora (Reseller Welcome configuration)
CREATE TABLE IF NOT EXISTS reseller_welcome_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  title VARCHAR(255),
  subtitle VARCHAR(255),
  description TEXT,
  card_color VARCHAR(7),
  background_color VARCHAR(7),
  button_color VARCHAR(7),
  text_color VARCHAR(7),
  font_family VARCHAR(100),
  form_title VARCHAR(255),
  button_text VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Links Apps (App Promotion configuration)
CREATE TABLE IF NOT EXISTS app_promotion_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  app_store_url TEXT,
  google_play_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_appearance_configs_contract_id ON appearance_configs(contract_id);
CREATE INDEX IF NOT EXISTS idx_verification_configs_contract_id ON verification_configs(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_configs_contract_id ON contract_configs(contract_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracker_configs_contract_id ON progress_tracker_configs(contract_id);
CREATE INDEX IF NOT EXISTS idx_reseller_welcome_configs_contract_id ON reseller_welcome_configs(contract_id);
CREATE INDEX IF NOT EXISTS idx_app_promotion_configs_contract_id ON app_promotion_configs(contract_id);

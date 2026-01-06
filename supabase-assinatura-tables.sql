-- ============================================
-- SCRIPT SQL PARA CRIAR TABELAS DE ASSINATURA DIGITAL NO SUPABASE
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: assinatura_global_config
-- Configurações globais de design (aplicadas como padrão a novos contratos)
-- ============================================
CREATE TABLE IF NOT EXISTS assinatura_global_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id VARCHAR(255) DEFAULT 'default',
  
  -- Aparência geral
  logo_url TEXT,
  logo_size VARCHAR(20) DEFAULT 'medium',
  logo_position VARCHAR(20) DEFAULT 'center',
  primary_color VARCHAR(7) DEFAULT '#2c3e50',
  text_color VARCHAR(7) DEFAULT '#333333',
  font_family VARCHAR(100) DEFAULT 'Arial, sans-serif',
  font_size VARCHAR(20) DEFAULT '16px',
  company_name VARCHAR(255) DEFAULT 'Sua Empresa',
  footer_text TEXT DEFAULT 'Documento gerado eletronicamente',
  
  -- Maleta (Progress Tracker Card)
  maleta_card_color VARCHAR(7) DEFAULT '#dbeafe',
  maleta_button_color VARCHAR(7) DEFAULT '#22c55e',
  maleta_text_color VARCHAR(7) DEFAULT '#1e40af',
  
  -- Verificação
  verification_primary_color VARCHAR(7) DEFAULT '#2c3e50',
  verification_text_color VARCHAR(7) DEFAULT '#000000',
  verification_font_family VARCHAR(100) DEFAULT 'Arial, sans-serif',
  verification_font_size VARCHAR(20) DEFAULT '16px',
  verification_logo_url TEXT,
  verification_logo_size VARCHAR(20) DEFAULT 'medium',
  verification_logo_position VARCHAR(20) DEFAULT 'center',
  verification_footer_text TEXT DEFAULT 'Verificação de Identidade Segura',
  verification_welcome_text VARCHAR(255) DEFAULT 'Verificação de Identidade',
  verification_instructions TEXT DEFAULT 'Processo seguro e rápido para confirmar sua identidade através de reconhecimento facial.',
  verification_security_text TEXT,
  verification_background_color VARCHAR(7) DEFAULT '#ffffff',
  verification_header_background_color VARCHAR(7) DEFAULT '#2c3e50',
  verification_header_company_name VARCHAR(255) DEFAULT 'Sua Empresa',
  
  -- Progress Tracker
  progress_card_color VARCHAR(7) DEFAULT '#dbeafe',
  progress_button_color VARCHAR(7) DEFAULT '#22c55e',
  progress_text_color VARCHAR(7) DEFAULT '#1e40af',
  progress_title VARCHAR(100) DEFAULT 'Assinatura Digital',
  progress_subtitle TEXT DEFAULT 'Conclua os passos abaixo para finalizar o processo.',
  progress_step1_title VARCHAR(255) DEFAULT '1. Reconhecimento Facial',
  progress_step1_description TEXT DEFAULT 'Tire uma selfie para validar sua identidade',
  progress_step2_title VARCHAR(255) DEFAULT '2. Assinar Contrato',
  progress_step2_description TEXT DEFAULT 'Assine digitalmente o contrato',
  progress_step3_title VARCHAR(255) DEFAULT '3. Confirmação',
  progress_step3_description TEXT DEFAULT 'Confirme seus dados e finalize',
  progress_button_text VARCHAR(255) DEFAULT 'Complete os passos acima',
  progress_font_family VARCHAR(100) DEFAULT 'Arial, sans-serif',
  
  -- Parabéns (Success Screen)
  parabens_title VARCHAR(255) DEFAULT 'Parabéns!',
  parabens_subtitle VARCHAR(255) DEFAULT 'Processo concluído com sucesso!',
  parabens_description TEXT DEFAULT 'Sua documentação foi processada. Aguarde as próximas instruções.',
  parabens_card_color VARCHAR(7) DEFAULT '#dbeafe',
  parabens_background_color VARCHAR(7) DEFAULT '#f0fdf4',
  parabens_button_color VARCHAR(7) DEFAULT '#22c55e',
  parabens_text_color VARCHAR(7) DEFAULT '#1e40af',
  parabens_font_family VARCHAR(100) DEFAULT 'Arial, sans-serif',
  parabens_form_title VARCHAR(255) DEFAULT 'Endereço para Entrega',
  parabens_button_text VARCHAR(255) DEFAULT 'Confirmar e Continuar',
  
  -- Apps
  app_store_url TEXT,
  google_play_url TEXT,
  
  -- Contrato (template de cláusulas)
  contract_clauses JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id)
);

-- ============================================
-- TABELA: assinatura_contracts
-- Armazena contratos individuais com todas suas configurações
-- ============================================
CREATE TABLE IF NOT EXISTS assinatura_contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tenant_id VARCHAR(255) DEFAULT 'default',
  
  -- Dados do cliente
  client_name VARCHAR(255) NOT NULL,
  client_cpf VARCHAR(14),
  client_email VARCHAR(255),
  client_phone VARCHAR(20),
  
  -- Status e metadados
  status VARCHAR(50) DEFAULT 'pending',
  access_token UUID DEFAULT uuid_generate_v4() UNIQUE,
  protocol_number VARCHAR(50),
  contract_html TEXT,
  contract_pdf_url TEXT,
  
  -- Endereço do cliente (preenchido na finalização)
  address_street VARCHAR(255),
  address_number VARCHAR(20),
  address_complement VARCHAR(100),
  address_city VARCHAR(100),
  address_state VARCHAR(2),
  address_zipcode VARCHAR(10),
  
  -- Fotos (selfie e documento)
  selfie_photo TEXT,
  document_photo TEXT,
  
  -- Aparência geral (copiada das configurações globais ou customizada)
  logo_url TEXT,
  logo_size VARCHAR(20) DEFAULT 'medium',
  logo_position VARCHAR(20) DEFAULT 'center',
  primary_color VARCHAR(7),
  text_color VARCHAR(7),
  font_family VARCHAR(100),
  font_size VARCHAR(20),
  company_name VARCHAR(255),
  footer_text TEXT,
  
  -- Maleta
  maleta_card_color VARCHAR(7),
  maleta_button_color VARCHAR(7),
  maleta_text_color VARCHAR(7),
  
  -- Verificação
  verification_primary_color VARCHAR(7),
  verification_text_color VARCHAR(7),
  verification_font_family VARCHAR(100),
  verification_font_size VARCHAR(20),
  verification_logo_url TEXT,
  verification_logo_size VARCHAR(20),
  verification_logo_position VARCHAR(20),
  verification_footer_text TEXT,
  verification_welcome_text VARCHAR(255),
  verification_instructions TEXT,
  verification_security_text TEXT,
  verification_background_color VARCHAR(7),
  verification_header_background_color VARCHAR(7),
  verification_header_company_name VARCHAR(255),
  
  -- Progress Tracker
  progress_card_color VARCHAR(7),
  progress_button_color VARCHAR(7),
  progress_text_color VARCHAR(7),
  progress_title VARCHAR(100),
  progress_subtitle TEXT,
  progress_step1_title VARCHAR(255),
  progress_step1_description TEXT,
  progress_step2_title VARCHAR(255),
  progress_step2_description TEXT,
  progress_step3_title VARCHAR(255),
  progress_step3_description TEXT,
  progress_button_text VARCHAR(255),
  progress_font_family VARCHAR(100),
  
  -- Parabéns
  parabens_title VARCHAR(255),
  parabens_subtitle VARCHAR(255),
  parabens_description TEXT,
  parabens_card_color VARCHAR(7),
  parabens_background_color VARCHAR(7),
  parabens_button_color VARCHAR(7),
  parabens_text_color VARCHAR(7),
  parabens_font_family VARCHAR(100),
  parabens_form_title VARCHAR(255),
  parabens_button_text VARCHAR(255),
  
  -- Apps
  app_store_url TEXT,
  google_play_url TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  signed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: assinatura_signature_logs
-- Logs de assinatura para auditoria
-- ============================================
CREATE TABLE IF NOT EXISTS assinatura_signature_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id UUID REFERENCES assinatura_contracts(id) ON DELETE CASCADE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  action VARCHAR(100) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA MELHOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_assinatura_contracts_access_token ON assinatura_contracts(access_token);
CREATE INDEX IF NOT EXISTS idx_assinatura_contracts_status ON assinatura_contracts(status);
CREATE INDEX IF NOT EXISTS idx_assinatura_contracts_tenant_id ON assinatura_contracts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assinatura_contracts_client_cpf ON assinatura_contracts(client_cpf);
CREATE INDEX IF NOT EXISTS idx_assinatura_global_config_tenant_id ON assinatura_global_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assinatura_signature_logs_contract_id ON assinatura_signature_logs(contract_id);

-- ============================================
-- ROW LEVEL SECURITY (Opcional)
-- Se usar Service Role Key no backend, não precisa habilitar RLS
-- ============================================

-- Inserir configuração padrão
INSERT INTO assinatura_global_config (tenant_id) 
VALUES ('default')
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================
-- CONCLUÍDO!
-- Execute este script no SQL Editor do Supabase
-- ============================================

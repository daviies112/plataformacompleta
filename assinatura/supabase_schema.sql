-- ============================================
-- SCRIPT SQL PARA CRIAR TABELAS NO SUPABASE
-- Plataforma de Assinatura de Contratos
-- ============================================

-- Habilitar extensão UUID (já vem habilitada por padrão no Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELA: users
-- Armazena dados dos usuários/clientes
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  nome_completo VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  cep VARCHAR(10),
  rua VARCHAR(255),
  numero VARCHAR(20),
  cidade VARCHAR(100),
  estado VARCHAR(2),
  endereco_completo TEXT,
  govbr_verified BOOLEAN DEFAULT FALSE,
  govbr_nivel_conta VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: contracts
-- Armazena contratos e seus metadados
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contract_html TEXT NOT NULL,
  contract_pdf_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  signed_at TIMESTAMPTZ,
  protocol_number VARCHAR(50) UNIQUE,
  client_name VARCHAR(255) NOT NULL DEFAULT '',
  client_cpf VARCHAR(14) NOT NULL DEFAULT '',
  client_email VARCHAR(255) NOT NULL DEFAULT '',
  client_phone VARCHAR(20),
  access_token UUID DEFAULT uuid_generate_v4() UNIQUE
);

-- ============================================
-- TABELA: signature_logs
-- Registra logs de assinatura para auditoria
-- ============================================
CREATE TABLE IF NOT EXISTS signature_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL,
  govbr_token_hash VARCHAR(255),
  govbr_auth_time TIMESTAMPTZ,
  signature_valid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: audit_trail
-- Trilha de auditoria para todas as ações
-- ============================================
CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES users(id),
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA MELHOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contracts_access_token ON contracts(access_token);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_client_cpf ON contracts(client_cpf);
CREATE INDEX IF NOT EXISTS idx_users_cpf ON users(cpf);
CREATE INDEX IF NOT EXISTS idx_signature_logs_contract_id ON signature_logs(contract_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_contract_id ON audit_trail(contract_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- IMPORTANTE: Para máxima segurança em produção,
-- use a Service Role Key no backend (não a anon key)
-- A Service Role Key bypassa RLS automaticamente
-- ============================================

-- OPÇÃO 1: RLS DESABILITADO (Recomendado se usando Service Role Key no backend)
-- Deixe as tabelas sem RLS se o backend usa Service Role Key
-- O acesso é controlado pelo backend, não pelo Supabase diretamente

-- OPÇÃO 2: RLS HABILITADO (Descomente se necessário)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE signature_logs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- Se habilitar RLS, crie políticas apropriadas para seu caso de uso
-- Por exemplo, para permitir apenas usuários autenticados:
-- CREATE POLICY "Authenticated users can read contracts" ON contracts
--   FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY "Service role full access" ON contracts
--   FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- CONCLUÍDO!
-- Execute este script no SQL Editor do Supabase
-- ============================================

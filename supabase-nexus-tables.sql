-- =============================================
-- NEXUS: SCHEMA DE MULTI-TENANCY PARA REVENDEDORAS
-- =============================================
-- Executar este SQL no Supabase Principal (Owner)
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- TABELA: REVENDEDORAS (Filhas do Admin)
-- LOGIN: Email + CPF (sem senha - mais seguro para revendedoras)
CREATE TABLE IF NOT EXISTS revendedoras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id TEXT NOT NULL, -- Referencia ao admin (tenant principal) - TEXT para compatibilidade
    nome TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    cpf TEXT NOT NULL, -- CPF usado como credencial de login (junto com email)
    telefone TEXT,
    subdominio_slug TEXT UNIQUE,
    status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'ativo', 'bloqueado')),
    comissao_padrao DECIMAL(5,2) DEFAULT 20.00,
    stripe_account_id TEXT,
    foto_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MIGRATION: Se a tabela já existe com admin_id UUID, execute:
-- ALTER TABLE revendedoras ALTER COLUMN admin_id TYPE TEXT;

-- TABELA: VENDAS (Para rastrear comissoes)
CREATE TABLE IF NOT EXISTS vendas_revendedora (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    revendedora_id UUID REFERENCES revendedoras(id),
    admin_id TEXT NOT NULL, -- TEXT para compatibilidade com tenant_id
    produto_id UUID,
    produto_nome TEXT,
    valor_total DECIMAL(10,2) NOT NULL,
    valor_comissao DECIMAL(10,2) NOT NULL,
    valor_empresa DECIMAL(10,2) NOT NULL,
    status_pagamento TEXT DEFAULT 'pendente',
    stripe_payment_id TEXT,
    cliente_nome TEXT,
    cliente_telefone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA: CONFIG SPLIT (Configuracao Stripe por Admin)
CREATE TABLE IF NOT EXISTS config_split (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id TEXT UNIQUE NOT NULL, -- TEXT para compatibilidade com tenant_id
    stripe_secret_key TEXT,
    stripe_publishable_key TEXT,
    gateway_preferido TEXT DEFAULT 'stripe',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDICES para performance
CREATE INDEX IF NOT EXISTS idx_revendedoras_admin ON revendedoras(admin_id);
CREATE INDEX IF NOT EXISTS idx_revendedoras_email ON revendedoras(email);
CREATE INDEX IF NOT EXISTS idx_revendedoras_cpf ON revendedoras(cpf);
CREATE INDEX IF NOT EXISTS idx_revendedoras_status ON revendedoras(status);
CREATE INDEX IF NOT EXISTS idx_vendas_revendedora ON vendas_revendedora(revendedora_id);
CREATE INDEX IF NOT EXISTS idx_vendas_admin ON vendas_revendedora(admin_id);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON vendas_revendedora(status_pagamento);

-- RLS (Row Level Security) - Opcional mas recomendado
ALTER TABLE revendedoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas_revendedora ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_split ENABLE ROW LEVEL SECURITY;

-- Comentarios para documentacao
COMMENT ON TABLE revendedoras IS 'Tabela de revendedoras vinculadas a um admin (tenant)';
COMMENT ON TABLE vendas_revendedora IS 'Registro de vendas feitas por revendedoras com split de comissao';
COMMENT ON TABLE config_split IS 'Configuracao do Stripe Connect para split de pagamentos por admin';

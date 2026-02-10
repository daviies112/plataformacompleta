-- ============================================================================
-- SUPABASE MASTER - SCHEMA CENTRAL PARA AUTENTICAÇÃO MULTITENANT
-- ============================================================================
-- Este schema deve ser executado no Supabase Master (credenciais nos Secrets)
-- Ele é a fonte central de verdade para logins de admins e revendedoras
-- ============================================================================

-- ============================================================================
-- 1. TABELA DE ADMINS (Dashboards A, B, C...)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    cpf VARCHAR(14) UNIQUE,
    password_hash VARCHAR(255),
    nome VARCHAR(255) NOT NULL,
    empresa VARCHAR(255),
    telefone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'pendente')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);

-- ============================================================================
-- 2. TABELA DE CREDENCIAIS SUPABASE POR ADMIN
-- ============================================================================
-- Cada admin tem seu próprio Supabase Database (Cliente)
-- As credenciais são armazenadas aqui de forma segura
CREATE TABLE IF NOT EXISTS admin_supabase_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    supabase_url VARCHAR(500) NOT NULL,
    supabase_anon_key TEXT NOT NULL,
    supabase_service_key TEXT,
    storage_bucket VARCHAR(255) DEFAULT 'documents',
    webhook_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(admin_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_creds_admin ON admin_supabase_credentials(admin_id);

-- ============================================================================
-- 3. TABELA CENTRALIZADA DE REVENDEDORAS (A1, A2, B1, B2...)
-- ============================================================================
-- IMPORTANTE: Esta é a tabela central de login de revendedoras
-- Ela substitui a tabela revendedoras que estava em cada Supabase Cliente
CREATE TABLE IF NOT EXISTS revendedoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('ativo', 'inativo', 'pendente', 'bloqueado')),
    comissao_padrao DECIMAL(5,2) DEFAULT 10.00,
    
    contract_id UUID,
    contract_signed_at TIMESTAMP WITH TIME ZONE,
    
    avatar_url TEXT,
    endereco_rua VARCHAR(255),
    endereco_numero VARCHAR(20),
    endereco_complemento VARCHAR(100),
    endereco_cidade VARCHAR(100),
    endereco_estado VARCHAR(2),
    endereco_cep VARCHAR(10),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(admin_id, email),
    UNIQUE(admin_id, cpf)
);

CREATE INDEX IF NOT EXISTS idx_revendedoras_admin ON revendedoras(admin_id);
CREATE INDEX IF NOT EXISTS idx_revendedoras_email ON revendedoras(email);
CREATE INDEX IF NOT EXISTS idx_revendedoras_cpf ON revendedoras(cpf);
CREATE INDEX IF NOT EXISTS idx_revendedoras_status ON revendedoras(status);
CREATE INDEX IF NOT EXISTS idx_revendedoras_contract ON revendedoras(contract_id);

-- ============================================================================
-- 4. TABELA DE CONFIGURAÇÕES WHITE-LABEL POR ADMIN
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_branding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    secondary_color VARCHAR(7) DEFAULT '#1E40AF',
    company_name VARCHAR(255),
    favicon_url TEXT,
    custom_css TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(admin_id)
);

-- ============================================================================
-- 5. TABELA DE LOG DE SINCRONIZAÇÃO
-- ============================================================================
-- Registra todas as sincronizações entre Supabase Cliente e Master
CREATE TABLE IF NOT EXISTS sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admins(id),
    event_type VARCHAR(50) NOT NULL,
    source_table VARCHAR(100),
    source_id UUID,
    payload JSONB,
    status VARCHAR(20) DEFAULT 'success' CHECK (status IN ('success', 'error', 'pending')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_log_admin ON sync_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_type ON sync_log(event_type);
CREATE INDEX IF NOT EXISTS idx_sync_log_created ON sync_log(created_at DESC);

-- ============================================================================
-- 6. FUNÇÃO PARA CRIAR REVENDEDORA A PARTIR DE CONTRATO ASSINADO
-- ============================================================================
CREATE OR REPLACE FUNCTION create_revendedora_from_contract(
    p_admin_id UUID,
    p_contract_id UUID,
    p_email VARCHAR(255),
    p_cpf VARCHAR(14),
    p_nome VARCHAR(255),
    p_telefone VARCHAR(20) DEFAULT NULL,
    p_endereco_rua VARCHAR(255) DEFAULT NULL,
    p_endereco_numero VARCHAR(20) DEFAULT NULL,
    p_endereco_cidade VARCHAR(100) DEFAULT NULL,
    p_endereco_estado VARCHAR(2) DEFAULT NULL,
    p_endereco_cep VARCHAR(10) DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
    v_revendedora_id UUID;
    v_cpf_normalizado VARCHAR(14);
BEGIN
    v_cpf_normalizado := regexp_replace(p_cpf, '[^0-9]', '', 'g');
    
    INSERT INTO revendedoras (
        admin_id, contract_id, email, cpf, nome, telefone,
        endereco_rua, endereco_numero, endereco_cidade, endereco_estado, endereco_cep,
        status, contract_signed_at
    )
    VALUES (
        p_admin_id, p_contract_id, LOWER(TRIM(p_email)), v_cpf_normalizado, p_nome, p_telefone,
        p_endereco_rua, p_endereco_numero, p_endereco_cidade, p_endereco_estado, p_endereco_cep,
        'ativo', NOW()
    )
    ON CONFLICT (admin_id, cpf) DO UPDATE SET
        email = EXCLUDED.email,
        nome = EXCLUDED.nome,
        telefone = COALESCE(EXCLUDED.telefone, revendedoras.telefone),
        contract_id = EXCLUDED.contract_id,
        contract_signed_at = NOW(),
        status = 'ativo',
        updated_at = NOW()
    RETURNING id INTO v_revendedora_id;
    
    INSERT INTO sync_log (admin_id, event_type, source_table, source_id, payload, status)
    VALUES (
        p_admin_id,
        'contract_signed',
        'contracts',
        p_contract_id,
        jsonb_build_object('revendedora_id', v_revendedora_id, 'email', p_email, 'cpf', v_cpf_normalizado),
        'success'
    );
    
    RETURN v_revendedora_id;
END;
$$;

-- ============================================================================
-- 7. FUNÇÃO PARA BUSCAR CREDENCIAIS DO ADMIN
-- ============================================================================
CREATE OR REPLACE FUNCTION get_admin_credentials(p_admin_id UUID)
RETURNS TABLE (
    supabase_url VARCHAR(500),
    supabase_anon_key TEXT,
    supabase_service_key TEXT,
    storage_bucket VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.supabase_url,
        c.supabase_anon_key,
        c.supabase_service_key,
        c.storage_bucket
    FROM admin_supabase_credentials c
    WHERE c.admin_id = p_admin_id AND c.is_active = true;
END;
$$;

-- ============================================================================
-- 8. RLS POLICIES (Desabilitado por padrão para acesso via service_key)
-- ============================================================================
ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_supabase_credentials DISABLE ROW LEVEL SECURITY;
ALTER TABLE revendedoras DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_branding DISABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 9. TRIGGER PARA ATUALIZAR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
CREATE TRIGGER update_admins_updated_at
    BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_revendedoras_updated_at ON revendedoras;
CREATE TRIGGER update_revendedoras_updated_at
    BEFORE UPDATE ON revendedoras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_creds_updated_at ON admin_supabase_credentials;
CREATE TRIGGER update_admin_creds_updated_at
    BEFORE UPDATE ON admin_supabase_credentials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FIM DO SCHEMA MASTER
-- ============================================================================

-- 🚀 Schema SQL para Sistema de Autenticação Multi-tenant
-- Execute este SQL no SQL Editor do Supabase Principal (do dono)

-- 1. Habilitar extensão para criptografia
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Tabela de Administradores (Clientes)
CREATE TABLE IF NOT EXISTS admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha TEXT NOT NULL, -- Hash bcrypt
    nome VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    
    -- Credenciais do Supabase do cliente
    supabase_url TEXT,
    supabase_anon_key TEXT,
    
    -- Timestamps
    criado_em TIMESTAMP DEFAULT NOW(),
    atualizado_em TIMESTAMP DEFAULT NOW(),
    ultimo_acesso TIMESTAMP
);

-- 3. Tabela de Sessões Ativas
CREATE TABLE IF NOT EXISTS sessoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP DEFAULT NOW(),
    expira_em TIMESTAMP NOT NULL
);

-- 4. Tabela de Logs de Acesso
CREATE TABLE IF NOT EXISTS logs_acesso (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
    email VARCHAR(255),
    sucesso BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    mensagem TEXT,
    criado_em TIMESTAMP DEFAULT NOW()
);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_ativo ON admins(ativo);
CREATE INDEX IF NOT EXISTS idx_sessoes_admin_id ON sessoes(admin_id);
CREATE INDEX IF NOT EXISTS idx_sessoes_ativo ON sessoes(ativo);
CREATE INDEX IF NOT EXISTS idx_logs_admin_id ON logs_acesso(admin_id);
CREATE INDEX IF NOT EXISTS idx_logs_criado_em ON logs_acesso(criado_em DESC);

-- 6. Função para verificar login
CREATE OR REPLACE FUNCTION verificar_login(p_email VARCHAR, p_senha TEXT)
RETURNS TABLE (
    sucesso BOOLEAN,
    id UUID,
    email VARCHAR,
    nome VARCHAR,
    supabase_url TEXT,
    supabase_anon_key TEXT
) AS $$
DECLARE
    v_admin RECORD;
BEGIN
    -- Buscar admin pelo email
    SELECT * INTO v_admin
    FROM admins
    WHERE admins.email = p_email
    AND ativo = true;
    
    -- Se não encontrou ou senha inválida
    IF v_admin IS NULL OR v_admin.senha != crypt(p_senha, v_admin.senha) THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, NULL::VARCHAR, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;
    
    -- Atualizar último acesso
    UPDATE admins
    SET ultimo_acesso = NOW(),
        atualizado_em = NOW()
    WHERE admins.id = v_admin.id;
    
    -- Retornar dados do admin
    RETURN QUERY SELECT 
        true,
        v_admin.id,
        v_admin.email,
        v_admin.nome,
        v_admin.supabase_url,
        v_admin.supabase_anon_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Função para hash de senha (para uso via API)
CREATE OR REPLACE FUNCTION hash_senha(p_senha TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(p_senha, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_admins
    BEFORE UPDATE ON admins
    FOR EACH ROW
    EXECUTE FUNCTION atualizar_timestamp();

-- 9. Função para limpar sessões expiradas (executar periodicamente)
CREATE OR REPLACE FUNCTION limpar_sessoes_expiradas()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM sessoes
    WHERE expira_em < NOW()
    OR (ativo = true AND criado_em < NOW() - INTERVAL '7 days');
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 10. Inserir admin de teste (REMOVER EM PRODUÇÃO)
INSERT INTO admins (email, senha, nome, ativo, supabase_url, supabase_anon_key)
VALUES (
    'admin@teste.com',
    crypt('senha123', gen_salt('bf', 10)),
    'Administrador Teste',
    true,
    'https://exemplo.supabase.co',
    'sua-chave-anon-aqui'
)
ON CONFLICT (email) DO NOTHING;

-- ✅ Schema criado com sucesso!
-- Próximo passo: Configurar os secrets no Replit e implementar o backend

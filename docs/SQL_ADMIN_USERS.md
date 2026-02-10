# SQL para Tabela de Administradores - Supabase Owner

Execute este SQL no SQL Editor do seu Supabase Owner para criar a tabela de administradores.

## 1. Criar Tabela admin_users

```sql
-- Tabela de administradores do sistema
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  company_name VARCHAR(255),
  company_email VARCHAR(255),
  plan_type VARCHAR(50) DEFAULT 'pro',
  tenant_id VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_tenant ON admin_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);
```

## 2. Função para Verificar Login

```sql
-- Função para verificar login de administrador
CREATE OR REPLACE FUNCTION verificar_login_admin(
  p_email VARCHAR,
  p_senha VARCHAR
)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  name VARCHAR,
  role VARCHAR,
  company_name VARCHAR,
  company_email VARCHAR,
  plan_type VARCHAR,
  tenant_id VARCHAR,
  password_hash VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email,
    au.name,
    au.role,
    au.company_name,
    au.company_email,
    au.plan_type,
    au.tenant_id,
    au.password_hash
  FROM admin_users au
  WHERE au.email = p_email
    AND au.is_active = true;
END;
$$;
```

## 3. Função para Criar Administrador

```sql
-- Função para criar novo administrador
CREATE OR REPLACE FUNCTION criar_admin(
  p_email VARCHAR,
  p_password_hash VARCHAR,
  p_name VARCHAR,
  p_company_name VARCHAR DEFAULT NULL,
  p_company_email VARCHAR DEFAULT NULL,
  p_plan_type VARCHAR DEFAULT 'pro',
  p_role VARCHAR DEFAULT 'admin'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_id UUID;
  new_tenant_id VARCHAR;
BEGIN
  -- Gerar tenant_id baseado no email
  new_tenant_id := 'dev-' || REPLACE(REPLACE(p_email, '@', '_'), '.', '_');
  
  INSERT INTO admin_users (
    email,
    password_hash,
    name,
    company_name,
    company_email,
    plan_type,
    role,
    tenant_id
  ) VALUES (
    p_email,
    p_password_hash,
    p_name,
    p_company_name,
    p_company_email,
    p_plan_type,
    p_role,
    new_tenant_id
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$;
```

## 4. Atualizar Último Login

```sql
-- Função para atualizar último login
CREATE OR REPLACE FUNCTION atualizar_ultimo_login(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_users 
  SET last_login = NOW(), updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;
```

## 5. Inserir Primeiro Administrador (Exemplo)

```sql
-- Insere o primeiro administrador (senha: 123456)
-- O hash abaixo corresponde à senha "123456" usando bcrypt
INSERT INTO admin_users (
  email,
  password_hash,
  name,
  company_name,
  company_email,
  plan_type,
  role,
  tenant_id
) VALUES (
  'daviemericko@gmail.com',
  '$2b$10$sxI6Ai8icfl0P3tKdF67wOsCmweeQvr314iAs/wIb3DDvowy60qP.',
  'Davi Emericko',
  'Nexus Intelligence',
  'contato@nexusintelligence.com.br',
  'enterprise',
  'superadmin',
  'dev-daviemericko_gmail_com'
) ON CONFLICT (email) DO NOTHING;
```

## Verificar Instalação

```sql
-- Verificar se a tabela foi criada
SELECT * FROM admin_users;

-- Verificar se as funções existem
SELECT proname FROM pg_proc WHERE proname LIKE '%admin%' OR proname LIKE 'criar_admin' OR proname LIKE 'verificar_login_admin';
```

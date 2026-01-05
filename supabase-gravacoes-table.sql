-- SQL para criar tabela de gravações no Supabase
-- Execute este SQL no SQL Editor do seu Supabase Dashboard

CREATE TABLE IF NOT EXISTS gravacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reuniao_id UUID NOT NULL,
  tenant_id TEXT NOT NULL,
  room_id_100ms TEXT,
  session_id_100ms TEXT,
  recording_id_100ms TEXT,
  asset_id TEXT,
  status TEXT DEFAULT 'recording',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  stopped_at TIMESTAMPTZ,
  duration INTEGER,
  file_url TEXT,
  file_size INTEGER,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_gravacoes_reuniao ON gravacoes(reuniao_id);
CREATE INDEX IF NOT EXISTS idx_gravacoes_tenant ON gravacoes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gravacoes_status ON gravacoes(status);
CREATE INDEX IF NOT EXISTS idx_gravacoes_room_id ON gravacoes(room_id_100ms);

-- RLS (Row Level Security) - Opcional mas recomendado
ALTER TABLE gravacoes ENABLE ROW LEVEL SECURITY;

-- Política para permitir operações apenas para o tenant correto
CREATE POLICY "Tenant pode ver suas gravações" ON gravacoes
  FOR SELECT USING (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY "Tenant pode inserir suas gravações" ON gravacoes
  FOR INSERT WITH CHECK (tenant_id = current_setting('app.tenant_id', true));

CREATE POLICY "Tenant pode atualizar suas gravações" ON gravacoes
  FOR UPDATE USING (tenant_id = current_setting('app.tenant_id', true));

-- Ou, para acesso mais simples via service_role key (sem RLS restritivo):
-- DROP POLICY IF EXISTS "Tenant pode ver suas gravações" ON gravacoes;
-- DROP POLICY IF EXISTS "Tenant pode inserir suas gravações" ON gravacoes;
-- DROP POLICY IF EXISTS "Tenant pode atualizar suas gravações" ON gravacoes;
-- ALTER TABLE gravacoes DISABLE ROW LEVEL SECURITY;

-- ============================================
-- EXECUTIVEAI PRO - MODULO DE ENVIO/FRETE
-- Execute este SQL no seu Supabase SQL Editor
-- ============================================

-- Tabela de Transportadoras
CREATE TABLE IF NOT EXISTS transportadoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL,
  nome VARCHAR(100) NOT NULL,
  codigo VARCHAR(50) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'nacional',
  logo_url TEXT,
  api_url TEXT,
  api_token TEXT,
  ativo BOOLEAN DEFAULT true,
  prazo_adicional_dias INTEGER DEFAULT 0,
  markup_percentual DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Cotacoes de Frete
CREATE TABLE IF NOT EXISTS cotacoes_frete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL,
  cep_origem VARCHAR(10) NOT NULL,
  cep_destino VARCHAR(10) NOT NULL,
  peso_kg DECIMAL(10,3) NOT NULL,
  altura_cm DECIMAL(10,2),
  largura_cm DECIMAL(10,2),
  comprimento_cm DECIMAL(10,2),
  valor_declarado DECIMAL(10,2),
  transportadora_id UUID REFERENCES transportadoras(id),
  transportadora_nome VARCHAR(100),
  servico VARCHAR(100),
  valor_frete DECIMAL(10,2),
  prazo_dias INTEGER,
  selecionado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Envios
CREATE TABLE IF NOT EXISTS envios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL,
  contract_id UUID,
  cotacao_id UUID REFERENCES cotacoes_frete(id),
  codigo_rastreio VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pendente',
  
  -- Dados do Remetente
  remetente_nome VARCHAR(200),
  remetente_cpf_cnpj VARCHAR(20),
  remetente_telefone VARCHAR(20),
  remetente_email VARCHAR(200),
  remetente_cep VARCHAR(10),
  remetente_logradouro VARCHAR(300),
  remetente_numero VARCHAR(20),
  remetente_complemento VARCHAR(100),
  remetente_bairro VARCHAR(100),
  remetente_cidade VARCHAR(100),
  remetente_uf VARCHAR(2),
  
  -- Dados do Destinatario
  destinatario_nome VARCHAR(200) NOT NULL,
  destinatario_cpf_cnpj VARCHAR(20),
  destinatario_telefone VARCHAR(20),
  destinatario_email VARCHAR(200),
  destinatario_cep VARCHAR(10) NOT NULL,
  destinatario_logradouro VARCHAR(300),
  destinatario_numero VARCHAR(20),
  destinatario_complemento VARCHAR(100),
  destinatario_bairro VARCHAR(100),
  destinatario_cidade VARCHAR(100),
  destinatario_uf VARCHAR(2),
  
  -- Dados do Pacote
  peso_kg DECIMAL(10,3),
  altura_cm DECIMAL(10,2),
  largura_cm DECIMAL(10,2),
  comprimento_cm DECIMAL(10,2),
  valor_declarado DECIMAL(10,2),
  descricao_conteudo TEXT,
  
  -- Dados da Transportadora
  transportadora_id UUID REFERENCES transportadoras(id),
  transportadora_nome VARCHAR(100),
  servico VARCHAR(100),
  valor_frete DECIMAL(10,2),
  prazo_estimado_dias INTEGER,
  data_previsao_entrega DATE,
  
  -- Datas
  data_postagem TIMESTAMP WITH TIME ZONE,
  data_entrega TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Eventos de Rastreamento
CREATE TABLE IF NOT EXISTS rastreamento_eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envio_id UUID NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
  codigo_rastreio VARCHAR(50),
  data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(100) NOT NULL,
  descricao TEXT,
  local VARCHAR(200),
  cidade VARCHAR(100),
  uf VARCHAR(2),
  origem_api BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Etiquetas de Envio
CREATE TABLE IF NOT EXISTS etiquetas_envio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  envio_id UUID NOT NULL REFERENCES envios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) DEFAULT 'pdf',
  url TEXT,
  conteudo_base64 TEXT,
  gerada_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Configuracoes de Frete por Tenant
CREATE TABLE IF NOT EXISTS config_frete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL UNIQUE,
  
  -- Endereco Padrao do Remetente
  remetente_nome VARCHAR(200),
  remetente_cpf_cnpj VARCHAR(20),
  remetente_telefone VARCHAR(20),
  remetente_email VARCHAR(200),
  remetente_cep VARCHAR(10),
  remetente_logradouro VARCHAR(300),
  remetente_numero VARCHAR(20),
  remetente_complemento VARCHAR(100),
  remetente_bairro VARCHAR(100),
  remetente_cidade VARCHAR(100),
  remetente_uf VARCHAR(2),
  
  -- Configuracoes Gerais
  frete_gratis_acima DECIMAL(10,2),
  prazo_adicional_dias INTEGER DEFAULT 0,
  markup_padrao DECIMAL(5,2) DEFAULT 0,
  
  -- APIs de Transportadoras
  correios_usuario VARCHAR(100),
  correios_senha VARCHAR(100),
  correios_contrato VARCHAR(50),
  correios_cartao VARCHAR(50),
  
  jadlog_token VARCHAR(200),
  loggi_api_key VARCHAR(200),
  azul_cargo_token VARCHAR(200),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Tabelas de Frete Personalizadas
CREATE TABLE IF NOT EXISTS tabela_frete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id TEXT NOT NULL,
  nome VARCHAR(100) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'peso',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Faixas de Frete (para tabelas personalizadas)
CREATE TABLE IF NOT EXISTS faixa_frete (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_id UUID NOT NULL REFERENCES tabela_frete(id) ON DELETE CASCADE,
  cep_inicio VARCHAR(10),
  cep_fim VARCHAR(10),
  uf VARCHAR(2),
  regiao VARCHAR(50),
  peso_min DECIMAL(10,3) DEFAULT 0,
  peso_max DECIMAL(10,3),
  valor_fixo DECIMAL(10,2),
  valor_por_kg DECIMAL(10,2),
  prazo_dias INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_envios_admin_id ON envios(admin_id);
CREATE INDEX IF NOT EXISTS idx_envios_status ON envios(status);
CREATE INDEX IF NOT EXISTS idx_envios_codigo_rastreio ON envios(codigo_rastreio);
CREATE INDEX IF NOT EXISTS idx_envios_created_at ON envios(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_envios_contract_id ON envios(contract_id);

-- Adicionar coluna contract_id se nao existir (para bancos existentes)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'envios' AND column_name = 'contract_id'
  ) THEN
    ALTER TABLE envios ADD COLUMN contract_id UUID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cotacoes_admin_id ON cotacoes_frete(admin_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_created_at ON cotacoes_frete(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_rastreamento_envio_id ON rastreamento_eventos(envio_id);
CREATE INDEX IF NOT EXISTS idx_rastreamento_codigo ON rastreamento_eventos(codigo_rastreio);

CREATE INDEX IF NOT EXISTS idx_transportadoras_admin_id ON transportadoras(admin_id);
CREATE INDEX IF NOT EXISTS idx_transportadoras_ativo ON transportadoras(ativo);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE transportadoras ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacoes_frete ENABLE ROW LEVEL SECURITY;
ALTER TABLE envios ENABLE ROW LEVEL SECURITY;
ALTER TABLE rastreamento_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE etiquetas_envio ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_frete ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabela_frete ENABLE ROW LEVEL SECURITY;
ALTER TABLE faixa_frete ENABLE ROW LEVEL SECURITY;

-- Politicas para transportadoras
CREATE POLICY "transportadoras_select" ON transportadoras FOR SELECT USING (true);
CREATE POLICY "transportadoras_insert" ON transportadoras FOR INSERT WITH CHECK (true);
CREATE POLICY "transportadoras_update" ON transportadoras FOR UPDATE USING (true);
CREATE POLICY "transportadoras_delete" ON transportadoras FOR DELETE USING (true);

-- Politicas para cotacoes_frete
CREATE POLICY "cotacoes_frete_select" ON cotacoes_frete FOR SELECT USING (true);
CREATE POLICY "cotacoes_frete_insert" ON cotacoes_frete FOR INSERT WITH CHECK (true);
CREATE POLICY "cotacoes_frete_update" ON cotacoes_frete FOR UPDATE USING (true);
CREATE POLICY "cotacoes_frete_delete" ON cotacoes_frete FOR DELETE USING (true);

-- Politicas para envios
CREATE POLICY "envios_select" ON envios FOR SELECT USING (true);
CREATE POLICY "envios_insert" ON envios FOR INSERT WITH CHECK (true);
CREATE POLICY "envios_update" ON envios FOR UPDATE USING (true);
CREATE POLICY "envios_delete" ON envios FOR DELETE USING (true);

-- Politicas para rastreamento_eventos
CREATE POLICY "rastreamento_eventos_select" ON rastreamento_eventos FOR SELECT USING (true);
CREATE POLICY "rastreamento_eventos_insert" ON rastreamento_eventos FOR INSERT WITH CHECK (true);
CREATE POLICY "rastreamento_eventos_update" ON rastreamento_eventos FOR UPDATE USING (true);
CREATE POLICY "rastreamento_eventos_delete" ON rastreamento_eventos FOR DELETE USING (true);

-- Politicas para etiquetas_envio
CREATE POLICY "etiquetas_envio_select" ON etiquetas_envio FOR SELECT USING (true);
CREATE POLICY "etiquetas_envio_insert" ON etiquetas_envio FOR INSERT WITH CHECK (true);
CREATE POLICY "etiquetas_envio_update" ON etiquetas_envio FOR UPDATE USING (true);
CREATE POLICY "etiquetas_envio_delete" ON etiquetas_envio FOR DELETE USING (true);

-- Politicas para config_frete
CREATE POLICY "config_frete_select" ON config_frete FOR SELECT USING (true);
CREATE POLICY "config_frete_insert" ON config_frete FOR INSERT WITH CHECK (true);
CREATE POLICY "config_frete_update" ON config_frete FOR UPDATE USING (true);
CREATE POLICY "config_frete_delete" ON config_frete FOR DELETE USING (true);

-- Politicas para tabela_frete
CREATE POLICY "tabela_frete_select" ON tabela_frete FOR SELECT USING (true);
CREATE POLICY "tabela_frete_insert" ON tabela_frete FOR INSERT WITH CHECK (true);
CREATE POLICY "tabela_frete_update" ON tabela_frete FOR UPDATE USING (true);
CREATE POLICY "tabela_frete_delete" ON tabela_frete FOR DELETE USING (true);

-- Politicas para faixa_frete
CREATE POLICY "faixa_frete_select" ON faixa_frete FOR SELECT USING (true);
CREATE POLICY "faixa_frete_insert" ON faixa_frete FOR INSERT WITH CHECK (true);
CREATE POLICY "faixa_frete_update" ON faixa_frete FOR UPDATE USING (true);
CREATE POLICY "faixa_frete_delete" ON faixa_frete FOR DELETE USING (true);

-- ============================================
-- DADOS INICIAIS - TRANSPORTADORAS PADRAO
-- ============================================

INSERT INTO transportadoras (admin_id, nome, codigo, tipo, ativo) VALUES
  ('system', 'Correios - SEDEX', 'correios_sedex', 'nacional', true),
  ('system', 'Correios - PAC', 'correios_pac', 'nacional', true),
  ('system', 'Jadlog - .Package', 'jadlog_package', 'nacional', true),
  ('system', 'Jadlog - .Com', 'jadlog_com', 'nacional', true),
  ('system', 'Loggi - Express', 'loggi_express', 'nacional', true),
  ('system', 'Azul Cargo - Amanha', 'azul_amanha', 'nacional', true),
  ('system', 'Azul Cargo - E-commerce', 'azul_ecommerce', 'nacional', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- FUNCAO PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_transportadoras_updated_at ON transportadoras;
CREATE TRIGGER update_transportadoras_updated_at
  BEFORE UPDATE ON transportadoras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_envios_updated_at ON envios;
CREATE TRIGGER update_envios_updated_at
  BEFORE UPDATE ON envios
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_config_frete_updated_at ON config_frete;
CREATE TRIGGER update_config_frete_updated_at
  BEFORE UPDATE ON config_frete
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tabela_frete_updated_at ON tabela_frete;
CREATE TRIGGER update_tabela_frete_updated_at
  BEFORE UPDATE ON tabela_frete
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FIM DO SCRIPT
-- ============================================

SELECT 'Modulo de Envio criado com sucesso!' AS resultado;

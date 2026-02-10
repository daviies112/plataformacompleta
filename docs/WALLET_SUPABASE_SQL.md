# SQL para Executar no Supabase - Sistema de Créditos & Wallet

Execute os comandos abaixo no **SQL Editor** do Supabase para criar o sistema de wallet.

---

## 1. Criar Tabela de Carteiras (wallets)

```sql
-- Tabela de carteiras - armazena saldo por tenant
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL UNIQUE,
  balance NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) NOT NULL DEFAULT 'BRL',
  is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  auto_recharge BOOLEAN NOT NULL DEFAULT FALSE,
  auto_recharge_trigger NUMERIC(10, 2),
  auto_recharge_amount NUMERIC(10, 2),
  saved_card_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índice para busca rápida por tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_tenant ON wallets(tenant_id);

-- Comentários
COMMENT ON TABLE wallets IS 'Carteiras de crédito para cada tenant do sistema';
COMMENT ON COLUMN wallets.balance IS 'Saldo atual em BRL';
COMMENT ON COLUMN wallets.is_frozen IS 'Carteira congelada por admin';
COMMENT ON COLUMN wallets.auto_recharge IS 'Recarga automática ativada';
```

---

## 2. Criar Tabela de Transações (wallet_transactions)

```sql
-- Tabela de transações - histórico imutável de movimentações
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('CREDIT', 'DEBIT', 'REFUND', 'BONUS')),
  amount NUMERIC(10, 2) NOT NULL,
  balance_before NUMERIC(10, 2) NOT NULL,
  balance_after NUMERIC(10, 2) NOT NULL,
  description TEXT NOT NULL,
  reference_id VARCHAR(100),
  reference_type VARCHAR(50),
  status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON wallet_transactions(created_at);

-- Comentários
COMMENT ON TABLE wallet_transactions IS 'Histórico imutável de todas as movimentações financeiras';
COMMENT ON COLUMN wallet_transactions.type IS 'CREDIT=entrada, DEBIT=saída, REFUND=estorno, BONUS=bônus';
```

---

## 3. Criar Tabela de Preços de Serviços (service_prices)

```sql
-- Tabela de preços dos serviços
CREATE TABLE IF NOT EXISTS service_prices (
  id SERIAL PRIMARY KEY,
  service_code VARCHAR(50) NOT NULL UNIQUE,
  service_name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índice para busca por código
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_prices_code ON service_prices(service_code);

-- Inserir preços padrão
INSERT INTO service_prices (service_code, service_name, price, cost_price, description)
VALUES 
  ('CPF_CONSULTA', 'Consulta CPF', 2.00, 0.03, 'Consulta de dados e validação de CPF via BigDataCorp'),
  ('ENVIO_REGISTRO', 'Registro de Envio', 3.00, 0.50, 'Registro de envio na transportadora'),
  ('CONTRATO_DIGITAL', 'Contrato Digital', 1.50, 0.00, 'Geração de contrato com assinatura digital'),
  ('SMS_ENVIO', 'Envio de SMS', 0.50, 0.10, 'Envio de SMS para notificações'),
  ('WHATSAPP_MSG', 'Mensagem WhatsApp', 0.30, 0.05, 'Envio de mensagem via WhatsApp Business')
ON CONFLICT (service_code) DO UPDATE SET
  service_name = EXCLUDED.service_name,
  price = EXCLUDED.price,
  cost_price = EXCLUDED.cost_price,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Comentários
COMMENT ON TABLE service_prices IS 'Tabela de preços configuráveis para cada serviço cobrado';
COMMENT ON COLUMN service_prices.price IS 'Preço cobrado do cliente';
COMMENT ON COLUMN service_prices.cost_price IS 'Custo real do serviço para a empresa';
```

---

## 4. Políticas de Segurança RLS (Row Level Security)

```sql
-- Habilitar RLS nas tabelas
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_prices ENABLE ROW LEVEL SECURITY;

-- Política para wallets - tenants só veem suas próprias carteiras
CREATE POLICY "Tenants can view own wallet" ON wallets
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY "Tenants can update own wallet" ON wallets
  FOR UPDATE USING (tenant_id = current_setting('app.current_tenant', true));

-- Política para transactions - tenants só veem suas próprias transações
CREATE POLICY "Tenants can view own transactions" ON wallet_transactions
  FOR SELECT USING (
    wallet_id IN (SELECT id FROM wallets WHERE tenant_id = current_setting('app.current_tenant', true))
  );

-- Política para service_prices - todos podem ver (read-only)
CREATE POLICY "Anyone can view service prices" ON service_prices
  FOR SELECT USING (true);

-- Nota: Admins podem ter políticas adicionais para gerenciamento
```

---

## 5. Funções Auxiliares (Opcional)

```sql
-- Função para debitar saldo com validação
CREATE OR REPLACE FUNCTION debit_wallet(
  p_tenant_id TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_reference_id TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance NUMERIC,
  transaction_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Buscar carteira
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM wallets
  WHERE tenant_id = p_tenant_id AND is_frozen = FALSE
  FOR UPDATE;
  
  IF v_wallet_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, NULL::UUID, 'Carteira não encontrada ou congelada'::TEXT;
    RETURN;
  END IF;
  
  -- Verificar saldo
  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT FALSE, v_current_balance, NULL::UUID, 'Saldo insuficiente'::TEXT;
    RETURN;
  END IF;
  
  v_new_balance := v_current_balance - p_amount;
  
  -- Criar transação
  INSERT INTO wallet_transactions (
    wallet_id, type, amount, balance_before, balance_after,
    description, reference_id, reference_type, status
  )
  VALUES (
    v_wallet_id, 'DEBIT', p_amount, v_current_balance, v_new_balance,
    p_description, p_reference_id, p_reference_type, 'COMPLETED'
  )
  RETURNING id INTO v_transaction_id;
  
  -- Atualizar saldo
  UPDATE wallets
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_wallet_id;
  
  RETURN QUERY SELECT TRUE, v_new_balance, v_transaction_id, NULL::TEXT;
END;
$$;

-- Função para creditar saldo
CREATE OR REPLACE FUNCTION credit_wallet(
  p_tenant_id TEXT,
  p_amount NUMERIC,
  p_description TEXT,
  p_type TEXT DEFAULT 'CREDIT',
  p_reference_id TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_balance NUMERIC,
  transaction_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  -- Buscar ou criar carteira
  SELECT id, balance INTO v_wallet_id, v_current_balance
  FROM wallets
  WHERE tenant_id = p_tenant_id
  FOR UPDATE;
  
  IF v_wallet_id IS NULL THEN
    -- Criar carteira
    INSERT INTO wallets (tenant_id, balance)
    VALUES (p_tenant_id, 0)
    RETURNING id, balance INTO v_wallet_id, v_current_balance;
  END IF;
  
  v_new_balance := v_current_balance + p_amount;
  
  -- Criar transação
  INSERT INTO wallet_transactions (
    wallet_id, type, amount, balance_before, balance_after,
    description, reference_id, reference_type, status
  )
  VALUES (
    v_wallet_id, p_type, p_amount, v_current_balance, v_new_balance,
    p_description, p_reference_id, p_reference_type, 'COMPLETED'
  )
  RETURNING id INTO v_transaction_id;
  
  -- Atualizar saldo
  UPDATE wallets
  SET balance = v_new_balance, updated_at = NOW()
  WHERE id = v_wallet_id;
  
  RETURN QUERY SELECT TRUE, v_new_balance, v_transaction_id, NULL::TEXT;
END;
$$;

-- Comentários
COMMENT ON FUNCTION debit_wallet IS 'Debita valor da carteira com validação de saldo';
COMMENT ON FUNCTION credit_wallet IS 'Credita valor na carteira (cria se não existir)';
```

---

## 6. Trigger para Atualizar updated_at

```sql
-- Função de trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para wallets
DROP TRIGGER IF EXISTS trigger_wallets_updated_at ON wallets;
CREATE TRIGGER trigger_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para service_prices
DROP TRIGGER IF EXISTS trigger_service_prices_updated_at ON service_prices;
CREATE TRIGGER trigger_service_prices_updated_at
  BEFORE UPDATE ON service_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Resumo

Após executar todos os comandos acima, você terá:

1. **wallets** - Tabela de carteiras por tenant
2. **wallet_transactions** - Histórico de movimentações (auditoria)
3. **service_prices** - Preços configuráveis dos serviços
4. **Políticas RLS** - Segurança por tenant
5. **Funções SQL** - `debit_wallet()` e `credit_wallet()` para operações seguras
6. **Triggers** - Atualização automática de timestamps

Os preços padrão já vêm configurados:
- Consulta CPF: R$ 2,00
- Registro de Envio: R$ 3,00
- Contrato Digital: R$ 1,50
- SMS: R$ 0,50
- WhatsApp: R$ 0,30

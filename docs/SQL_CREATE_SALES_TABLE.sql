-- SQL para criar a tabela sales_with_split no Supabase CLIENTE
-- Execute este SQL no SQL Editor do seu projeto Supabase

-- Criar tabela sales_with_split
CREATE TABLE IF NOT EXISTS public.sales_with_split (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL,
    reseller_id UUID NOT NULL,
    company_id UUID,
    payment_method VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'aguardando_pagamento',
    total_amount DECIMAL(10,2) NOT NULL,
    reseller_amount DECIMAL(10,2) NOT NULL,
    company_amount DECIMAL(10,2) NOT NULL,
    commission_percentage DECIMAL(5,2),
    quantity INTEGER DEFAULT 1,
    paid BOOLEAN DEFAULT FALSE,
    paid_at TIMESTAMPTZ,
    pagarme_order_id VARCHAR(100),
    pagarme_charge_id VARCHAR(100),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_document VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_sales_reseller_id ON public.sales_with_split(reseller_id);
CREATE INDEX IF NOT EXISTS idx_sales_product_id ON public.sales_with_split(product_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales_with_split(status);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales_with_split(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_pagarme_order ON public.sales_with_split(pagarme_order_id);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.sales_with_split ENABLE ROW LEVEL SECURITY;

-- Política para service_role (backend) ter acesso total
CREATE POLICY "service_role_full_access" ON public.sales_with_split
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Política para usuários autenticados verem apenas suas vendas
CREATE POLICY "resellers_view_own_sales" ON public.sales_with_split
    FOR SELECT
    USING (auth.uid()::text = reseller_id::text);

-- Habilitar realtime para atualizações em tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales_with_split;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sales_with_split_updated_at ON public.sales_with_split;
CREATE TRIGGER update_sales_with_split_updated_at
    BEFORE UPDATE ON public.sales_with_split
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.sales_with_split IS 'Vendas com divisão de comissão entre revendedora e empresa';
COMMENT ON COLUMN public.sales_with_split.reseller_id IS 'ID da revendedora que fez a venda';
COMMENT ON COLUMN public.sales_with_split.commission_percentage IS 'Percentual de comissão da revendedora';
COMMENT ON COLUMN public.sales_with_split.reseller_amount IS 'Valor da comissão da revendedora em reais';
COMMENT ON COLUMN public.sales_with_split.company_amount IS 'Valor que fica com a empresa em reais';

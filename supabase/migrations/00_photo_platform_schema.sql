-- 📸 PHOTO PLATFORM SCHEMA MIGRATION

-- 1. Tabela: imagens_gratis (Service 1: Enhance Photos - Free)
CREATE TABLE IF NOT EXISTS public.imagens_gratis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  
  -- Images
  foto_original_url TEXT NOT NULL,
  foto_melhorada_url TEXT,
  
  -- Metadata
  descricao_produto TEXT,
  ajustes_aplicados JSONB,
  erro_mensagem TEXT,
  
  -- Status: pendente -> processando -> concluido -> erro
  status VARCHAR(50) DEFAULT 'pendente',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for imagens_gratis
CREATE INDEX IF NOT EXISTS idx_gratis_user ON public.imagens_gratis(user_id);
CREATE INDEX IF NOT EXISTS idx_gratis_status ON public.imagens_gratis(status);
CREATE INDEX IF NOT EXISTS idx_gratis_created ON public.imagens_gratis(created_at DESC);

-- RLS for imagens_gratis
ALTER TABLE public.imagens_gratis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own free photos" 
  ON public.imagens_gratis
  FOR SELECT 
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own free photos" 
  ON public.imagens_gratis
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);
  
-- Note: Service Role (N8N) bypasses RLS, so no specific policy needed for update if using service role.


-- 2. Tabela: imagens_9fotos (Service 2: 9 Photos - Paid)
CREATE TABLE IF NOT EXISTS public.imagens_9fotos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  
  -- Original Image
  foto_original_url TEXT NOT NULL,
  
  -- Generated Photos (1-9)
  foto_1_url TEXT, foto_1_descricao TEXT,
  foto_2_url TEXT, foto_2_descricao TEXT,
  foto_3_url TEXT, foto_3_descricao TEXT,
  foto_4_url TEXT, foto_4_descricao TEXT,
  foto_5_url TEXT, foto_5_descricao TEXT,
  foto_6_url TEXT, foto_6_descricao TEXT,
  foto_7_url TEXT, foto_7_descricao TEXT,
  foto_8_url TEXT, foto_8_descricao TEXT,
  foto_9_url TEXT, foto_9_descricao TEXT,
  
  -- Selected Templates (IDs from 1 to 15)
  templates_escolhidos JSONB, 
  
  -- Payment Info
  is_gratis BOOLEAN DEFAULT FALSE,
  valor_pago DECIMAL(10,2) DEFAULT 0.00,
  payment_id VARCHAR(255),
  
  -- Metadata
  descricao_produto TEXT,
  categoria VARCHAR(50), -- brinco, colar, pulseira, anel
  erro_mensagem TEXT,
  
  -- Status: pendente -> processando -> concluido -> erro
  status VARCHAR(50) DEFAULT 'pendente',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for imagens_9fotos
CREATE INDEX IF NOT EXISTS idx_9fotos_user ON public.imagens_9fotos(user_id);
CREATE INDEX IF NOT EXISTS idx_9fotos_status ON public.imagens_9fotos(status);
CREATE INDEX IF NOT EXISTS idx_9fotos_created ON public.imagens_9fotos(created_at DESC);

-- RLS for imagens_9fotos
ALTER TABLE public.imagens_9fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own 9-photo sets" 
  ON public.imagens_9fotos
  FOR SELECT 
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own 9-photo sets" 
  ON public.imagens_9fotos
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);


-- STORAGE BUCKETS INSTRUCTION
-- Please create two PUBLIC buckets in Supabase Storage dashboard:
-- 1. 'fotos_servico_gratis'
-- 2. 'fotos_servico_9pack'

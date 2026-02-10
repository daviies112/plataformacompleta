# 🚀 SETUP SUPABASE - SCRIPT SQL

## ⚠️ IMPORTANTE
Execute **TODO este script** no **SQL Editor do Supabase** para criar as tabelas que salvam todas as configurações de cada página.

---

## 📋 COMO USAR

1. Acesse seu projeto Supabase
2. Vá para: **SQL Editor** (canto esquerdo)
3. Clique em **New Query**
4. **Copie e cole TODO o código abaixo**
5. Clique em **Run**

---

## 🔧 SCRIPT COMPLETO (Execute no Supabase SQL Editor)

```sql
-- ============================================
-- 1. APARÊNCIA (Página de Customização)
-- Salva: Logo, cores, fontes, empresa
-- ============================================
CREATE TABLE IF NOT EXISTS appearance_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  logo_url TEXT,
  logo_size VARCHAR(20) DEFAULT 'medium',
  logo_position VARCHAR(20) DEFAULT 'center',
  primary_color VARCHAR(7),
  text_color VARCHAR(7) DEFAULT '#333333',
  font_family VARCHAR(100),
  font_size VARCHAR(20),
  company_name VARCHAR(255),
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. VERIFICAÇÃO (Facial Recognition Page)
-- Salva: Cores, fontes, logo, textos, backgrounds
-- ============================================
CREATE TABLE IF NOT EXISTS verification_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  primary_color VARCHAR(7),
  text_color VARCHAR(7) DEFAULT '#000000',
  font_family VARCHAR(100),
  font_size VARCHAR(20),
  logo_url TEXT,
  logo_size VARCHAR(20) DEFAULT 'medium',
  logo_position VARCHAR(20) DEFAULT 'center',
  footer_text TEXT,
  welcome_text VARCHAR(255),
  instructions TEXT,
  security_text TEXT,
  background_image TEXT,
  background_color VARCHAR(7) DEFAULT '#ffffff',
  icon_url TEXT,
  header_background_color VARCHAR(7) DEFAULT '#2c3e50',
  header_logo_url TEXT,
  header_company_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. CONTRATO (Contract Page)
-- Salva: Título, cláusulas, cores, fontes
-- ============================================
CREATE TABLE IF NOT EXISTS contract_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  title VARCHAR(255),
  clauses JSONB,
  logo_url TEXT,
  logo_size VARCHAR(20) DEFAULT 'medium',
  logo_position VARCHAR(20) DEFAULT 'center',
  primary_color VARCHAR(7),
  text_color VARCHAR(7) DEFAULT '#333333',
  font_family VARCHAR(100),
  font_size VARCHAR(20),
  company_name VARCHAR(255),
  footer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. PROGRESSO (Progress Tracker)
-- Salva: Cores, títulos dos 3 passos, textos
-- ============================================
CREATE TABLE IF NOT EXISTS progress_tracker_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  card_color VARCHAR(7) DEFAULT '#dbeafe',
  button_color VARCHAR(7) DEFAULT '#22c55e',
  text_color VARCHAR(7) DEFAULT '#1e40af',
  title VARCHAR(100) DEFAULT 'Assinatura Digital',
  subtitle TEXT,
  step1_title VARCHAR(255),
  step1_description TEXT,
  step2_title VARCHAR(255),
  step2_description TEXT,
  step3_title VARCHAR(255),
  step3_description TEXT,
  button_text VARCHAR(255),
  font_family VARCHAR(100),
  font_size VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 5. PARABÉNS / REVENDEDORA (Reseller Welcome)
-- Salva: Títulos, cores, fontes, textos
-- ============================================
CREATE TABLE IF NOT EXISTS reseller_welcome_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  title VARCHAR(255),
  subtitle VARCHAR(255),
  description TEXT,
  card_color VARCHAR(7) DEFAULT '#dbeafe',
  background_color VARCHAR(7) DEFAULT '#f0fdf4',
  button_color VARCHAR(7) DEFAULT '#22c55e',
  text_color VARCHAR(7) DEFAULT '#1e40af',
  font_family VARCHAR(100),
  form_title VARCHAR(255),
  button_text VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. LINKS APPS (App Promotion)
-- Salva: URLs do App Store e Google Play
-- ============================================
CREATE TABLE IF NOT EXISTS app_promotion_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL,
  app_store_url TEXT,
  google_play_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_appearance_configs_contract_id ON appearance_configs(contract_id);
CREATE INDEX IF NOT EXISTS idx_verification_configs_contract_id ON verification_configs(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_configs_contract_id ON contract_configs(contract_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracker_configs_contract_id ON progress_tracker_configs(contract_id);
CREATE INDEX IF NOT EXISTS idx_reseller_welcome_configs_contract_id ON reseller_welcome_configs(contract_id);
CREATE INDEX IF NOT EXISTS idx_app_promotion_configs_contract_id ON app_promotion_configs(contract_id);
```

---

## ✅ O QUE VAI ACONTECER APÓS EXECUTAR

1. ✅ **6 tabelas criadas** no Supabase
2. ✅ **Índices criados** para performance rápida
3. ✅ **API endpoints prontos** para salvar dados
4. ✅ **Cada página preenche seus dados** automaticamente

---

## 📡 ENDPOINTS DA API (já estão programados)

Quando você preencher cada página no admin, os dados serão salvos automaticamente:

### APARÊNCIA
```
GET  /api/config/appearance/:contractId
POST /api/config/appearance/:contractId
```

### VERIFICAÇÃO
```
GET  /api/config/verification/:contractId
POST /api/config/verification/:contractId
```

### CONTRATO
```
GET  /api/config/contract/:contractId
POST /api/config/contract/:contractId
```

### PROGRESSO
```
GET  /api/config/progress/:contractId
POST /api/config/progress/:contractId
```

### PARABÉNS (Revendedora)
```
GET  /api/config/reseller-welcome/:contractId
POST /api/config/reseller-welcome/:contractId
```

### LINKS APPS
```
GET  /api/config/app-promotion/:contractId
POST /api/config/app-promotion/:contractId
```

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ **Execute o script SQL** no editor do Supabase
2. ⏳ **Verifique as tabelas** na aba "Tables" do Supabase
3. 🔌 **Api endpoints estão prontos** para receber dados
4. 💾 **Admin preenche páginas** e dados são salvos automaticamente

---

## ⚠️ IMPORTANTE: Página "Dados Cliente"

A página **"Dados Cliente"** **NÃO precisa salvar** no Supabase (ela é usada apenas para criar o contrato).

Todas as outras páginas salvam:
- ✅ Aparência
- ✅ Verificação  
- ✅ Contrato
- ✅ Progresso
- ✅ Parabéns
- ✅ Links Apps

---

## 🐛 SE ALGO DER ERRADO

Se receber erro ao executar o script:
1. Copie TODO o código de uma vez
2. Clique em "Run" uma única vez
3. Se erro de sintaxe, verifique se não copiou quebrado
4. Tente em um "New Query" novo

Pronto! ✅

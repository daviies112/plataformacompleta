-- ===========================================
-- PASSO 1: Verificar a situação atual
-- ===========================================

-- Vendas por reseller_id:
SELECT reseller_id, COUNT(*) as total_vendas 
FROM sales_with_split 
GROUP BY reseller_id
ORDER BY total_vendas DESC;

-- Lojas existentes:
SELECT id, reseller_id, store_name, store_slug, is_published
FROM reseller_stores;

-- ===========================================
-- RESULTADOS ATUAIS DO SEU SISTEMA:
-- ===========================================
-- Vendas:
--   40118e52-cb4e-4555-bec8-bc1f7819424a: 7 vendas
--   00000000-0000-0000-0000-000000000000: 11 vendas (ID zerado - teste)
--   00000000-0000-0000-0000-000000000001: 3 vendas (ID zerado - teste)
--
-- Lojas:
--   40118e52-cb4e-4555-bec8-bc1f7819424a (loja "teste", publicada)
--   e12d9dd7-f0e3-4d0d-a6ac-a090324e2c9e (publicada)
--   00000000-0000-0000-0000-000000000001 (não publicada)

-- ===========================================
-- PASSO 2: Migrar vendas com IDs zerados
-- ===========================================
-- Execute UM por vez, substituindo pelo ID correto da revendedora

-- Opção A: Migrar vendas de ID zerado para o ID principal
-- (Substitua 'SEU_RESELLER_ID_DO_LOGIN' pelo ID que você recebe ao fazer login)

-- Migrar vendas do ID 00000000-0000-0000-0000-000000000000
UPDATE sales_with_split 
SET reseller_id = '40118e52-cb4e-4555-bec8-bc1f7819424a'
WHERE reseller_id = '00000000-0000-0000-0000-000000000000';

-- Migrar vendas do ID 00000000-0000-0000-0000-000000000001
UPDATE sales_with_split 
SET reseller_id = '40118e52-cb4e-4555-bec8-bc1f7819424a'
WHERE reseller_id = '00000000-0000-0000-0000-000000000001';

-- ===========================================
-- PASSO 3: Verificar resultado
-- ===========================================
SELECT reseller_id, COUNT(*) as total_vendas 
FROM sales_with_split 
GROUP BY reseller_id;

-- ===========================================
-- ALTERNATIVA: Se seu ID de login for diferente
-- ===========================================
-- Se ao fazer login você receber um ID diferente de 40118e52-cb4e-4555-bec8-bc1f7819424a,
-- use esse ID no lugar. Exemplo:
--
-- UPDATE sales_with_split 
-- SET reseller_id = 'SEU_ID_DE_LOGIN_AQUI'
-- WHERE reseller_id = '40118e52-cb4e-4555-bec8-bc1f7819424a';
--
-- UPDATE reseller_stores 
-- SET reseller_id = 'SEU_ID_DE_LOGIN_AQUI'
-- WHERE reseller_id = '40118e52-cb4e-4555-bec8-bc1f7819424a';

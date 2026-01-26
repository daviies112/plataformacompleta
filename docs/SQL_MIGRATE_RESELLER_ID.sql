-- SQL para migrar reseller_id de um ID antigo para o ID correto
-- EXECUTE COM CUIDADO - Substitua os valores OLD_ID e NEW_ID pelos IDs reais
-- 
-- IMPORTANTE: Execute este SQL no Supabase CLIENTE (não no Owner/Master)
-- 
-- Para descobrir os IDs:
-- 1. Acesse /api/health/sales-debug para ver os IDs das vendas existentes
-- 2. Verifique qual ID a revendedora recebe ao fazer login (console do navegador)
-- 3. Compare os IDs e migre do antigo para o novo

-- PASSO 1: Identificar os IDs
-- Veja quais reseller_ids existem nas vendas
SELECT DISTINCT reseller_id, COUNT(*) as total_vendas 
FROM sales_with_split 
GROUP BY reseller_id;

-- Veja quais reseller_ids existem nas lojas
SELECT id, reseller_id, store_name, store_slug 
FROM reseller_stores;

-- PASSO 2: Migrar (SUBSTITUA os valores)
-- Substitua 'ID_ANTIGO_AQUI' pelo ID que aparece nas vendas
-- Substitua 'ID_NOVO_AQUI' pelo ID que a revendedora recebe no login

-- Exemplo real do seu sistema:
-- ID antigo nas vendas: 40118e52-cb4e-4555-bec8-bc1f7819424a
-- ID novo do login: [obtenha fazendo login e verificando o console]

BEGIN;

-- Atualizar reseller_stores
UPDATE reseller_stores 
SET reseller_id = 'ID_NOVO_AQUI', updated_at = NOW()
WHERE reseller_id = 'ID_ANTIGO_AQUI';

-- Atualizar sales_with_split
UPDATE sales_with_split 
SET reseller_id = 'ID_NOVO_AQUI'
WHERE reseller_id = 'ID_ANTIGO_AQUI';

-- Verificar as alterações antes de confirmar
SELECT 'reseller_stores' as tabela, COUNT(*) as registros_afetados 
FROM reseller_stores WHERE reseller_id = 'ID_NOVO_AQUI'
UNION ALL
SELECT 'sales_with_split' as tabela, COUNT(*) as registros_afetados 
FROM sales_with_split WHERE reseller_id = 'ID_NOVO_AQUI';

-- Se estiver correto, confirme a transação
COMMIT;

-- Se algo deu errado, cancele com ROLLBACK ao invés de COMMIT
-- ROLLBACK;

-- PASSO 3: Verificar resultado
SELECT 'Lojas atualizadas:', COUNT(*) FROM reseller_stores WHERE reseller_id = 'ID_NOVO_AQUI';
SELECT 'Vendas atualizadas:', COUNT(*) FROM sales_with_split WHERE reseller_id = 'ID_NOVO_AQUI';

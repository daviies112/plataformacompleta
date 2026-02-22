
-- CONVERSÃO DEFINITIVA DE UUID PARA TEXT
-- Executando comandos um por um sem bloco DO para ver erros claramente

ALTER TABLE store_settings ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT;
ALTER TABLE store_campaigns ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT;
ALTER TABLE store_banners ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT;
ALTER TABLE store_benefits ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT;
ALTER TABLE store_videos ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT;
ALTER TABLE store_mosaics ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT;
ALTER TABLE store_themes ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT;
ALTER TABLE store_sections ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT;
ALTER TABLE store_collections ALTER COLUMN tenant_id TYPE TEXT USING tenant_id::TEXT;

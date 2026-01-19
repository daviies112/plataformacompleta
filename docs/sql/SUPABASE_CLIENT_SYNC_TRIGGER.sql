-- ============================================================================
-- SUPABASE CLIENTE - TRIGGER DE SINCRONIZAÇÃO COM MASTER
-- ============================================================================
-- Este SQL deve ser executado em CADA Supabase Cliente (do Admin A, B, C...)
-- Ele cria um trigger que notifica o servidor quando um contrato é assinado
-- ============================================================================

-- ============================================================================
-- 1. TABELA DE FILA DE SINCRONIZAÇÃO
-- ============================================================================
-- Esta tabela armazena eventos pendentes para sincronizar com o Master
CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);

-- ============================================================================
-- 2. FUNÇÃO PARA ENFILEIRAR EVENTO DE CONTRATO ASSINADO
-- ============================================================================
CREATE OR REPLACE FUNCTION queue_contract_signed_event()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'signed' AND (OLD.status IS NULL OR OLD.status != 'signed') THEN
        INSERT INTO sync_queue (
            event_type,
            table_name,
            record_id,
            payload
        )
        VALUES (
            'contract_signed',
            'contracts',
            NEW.id,
            jsonb_build_object(
                'contract_id', NEW.id,
                'client_name', NEW.client_name,
                'client_email', NEW.client_email,
                'client_cpf', NEW.client_cpf,
                'client_phone', NEW.client_phone,
                'address_street', NEW.address_street,
                'address_number', NEW.address_number,
                'address_city', NEW.address_city,
                'address_state', NEW.address_state,
                'address_zipcode', NEW.address_zipcode,
                'signed_at', NEW.signed_at,
                'admin_id', NEW.admin_id
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. TRIGGER NA TABELA CONTRACTS
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_contract_signed ON contracts;

CREATE TRIGGER trigger_contract_signed
    AFTER INSERT OR UPDATE OF status
    ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION queue_contract_signed_event();

-- ============================================================================
-- 4. FUNÇÃO PARA MARCAR COMO PROCESSADO (chamada pelo servidor)
-- ============================================================================
CREATE OR REPLACE FUNCTION mark_sync_processed(
    p_queue_id UUID,
    p_status VARCHAR(20) DEFAULT 'completed',
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE sync_queue
    SET 
        status = p_status,
        processed_at = NOW(),
        error_message = p_error_message,
        retry_count = CASE WHEN p_status = 'failed' THEN retry_count + 1 ELSE retry_count END
    WHERE id = p_queue_id;
END;
$$;

-- ============================================================================
-- 5. VIEW PARA EVENTOS PENDENTES
-- ============================================================================
CREATE OR REPLACE VIEW pending_sync_events AS
SELECT 
    sq.*,
    c.client_name,
    c.client_email,
    c.status as contract_status
FROM sync_queue sq
LEFT JOIN contracts c ON c.id = sq.record_id
WHERE sq.status = 'pending'
ORDER BY sq.created_at ASC;

-- ============================================================================
-- 6. LIMPEZA AUTOMÁTICA DE EVENTOS ANTIGOS (opcional)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_sync_events()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sync_queue
    WHERE status = 'completed' 
      AND processed_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ============================================================================
-- INSTRUÇÕES DE USO:
-- ============================================================================
-- 1. Execute este SQL no Supabase de cada Admin (A, B, C...)
-- 2. O trigger vai criar entradas na sync_queue quando contratos são assinados
-- 3. O servidor faz polling na sync_queue para processar eventos
-- 4. Após processar, o servidor chama mark_sync_processed()
-- ============================================================================

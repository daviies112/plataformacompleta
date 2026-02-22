
-- Workspace Public Sharing Infrastructure

-- Mapping table to resolve public slugs/tokens
CREATE TABLE IF NOT EXISTS workspace_public_mapping (
    id TEXT PRIMARY KEY, -- The public token/slug (e.g., 'wp_abc123')
    item_id TEXT NOT NULL,
    item_type TEXT NOT NULL, -- 'page', 'database', 'board'
    tenant_id TEXT NOT NULL,
    client_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_public_item ON workspace_public_mapping(item_id, item_type);
CREATE INDEX IF NOT EXISTS idx_workspace_public_tenant ON workspace_public_mapping(tenant_id);

-- Add public flag to main tables for quick checks in the application
-- Try-catch individual ALTER statements in case columns already exist
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE workspace_pages ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column is_public already exists in workspace_pages.';
    END;

    BEGIN
        ALTER TABLE workspace_pages ADD COLUMN public_slug TEXT UNIQUE;
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column public_slug already exists in workspace_pages.';
    END;

    BEGIN
        ALTER TABLE workspace_databases ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column is_public already exists in workspace_databases.';
    END;

    BEGIN
        ALTER TABLE workspace_databases ADD COLUMN public_slug TEXT UNIQUE;
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column public_slug already exists in workspace_databases.';
    END;

    BEGIN
        ALTER TABLE workspace_boards ADD COLUMN is_public BOOLEAN DEFAULT FALSE;
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column is_public already exists in workspace_boards.';
    END;

    BEGIN
        ALTER TABLE workspace_boards ADD COLUMN public_slug TEXT UNIQUE;
    EXCEPTION
        WHEN duplicate_column THEN RAISE NOTICE 'column public_slug already exists in workspace_boards.';
    END;
END $$;

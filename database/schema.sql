
-- 1. User accounts
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL
        CHECK (role IN ('admin', 'owner', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Documents and their private file contents
CREATE TABLE IF NOT EXISTS documents (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_id BIGINT NOT NULL REFERENCES users(id),
    filename VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'general',
    mime_type VARCHAR(100) NOT NULL,
    file_data BYTEA NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Explicit document permissions
CREATE TABLE IF NOT EXISTS document_permissions (
    document_id BIGINT NOT NULL
        REFERENCES documents(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL
        REFERENCES users(id),
    permission VARCHAR(10) NOT NULL
        CHECK (permission IN ('read', 'edit')),
    granted_by BIGINT NOT NULL REFERENCES users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, user_id)
);

-- 4. Audit records
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id BIGINT REFERENCES users(id),
    document_id BIGINT,
    action VARCHAR(50) NOT NULL,
    outcome VARCHAR(20) NOT NULL
        CHECK (outcome IN ('allowed', 'denied', 'error')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_documents_owner
    ON documents(owner_id);

CREATE INDEX IF NOT EXISTS idx_documents_category
    ON documents(category);

CREATE INDEX IF NOT EXISTS idx_documents_created
    ON documents(created_at);

CREATE INDEX IF NOT EXISTS idx_documents_filename
    ON documents(filename);

CREATE INDEX IF NOT EXISTS idx_audit_document
    ON audit_logs(document_id);

CREATE INDEX IF NOT EXISTS idx_audit_time
    ON audit_logs(occurred_at);

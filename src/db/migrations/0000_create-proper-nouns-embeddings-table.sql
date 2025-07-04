-- Custom SQL migration file, put your code below! --
CREATE TABLE IF NOT EXISTS proper_noun_embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT,
    metadata TEXT,
    EMBEDDING_COLUMN F32_BLOB(3072) -- 1536-dimensional f32 vector for OpenAI
);--> statement-breakpoint

CREATE INDEX IF NOT EXISTS idx_proper_noun_embeddings_EMBEDDING_COLUMN ON proper_noun_embeddings(libsql_vector_idx(EMBEDDING_COLUMN));




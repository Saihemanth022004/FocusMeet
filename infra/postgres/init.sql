-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Confirm installation
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';

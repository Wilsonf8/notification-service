-- Fix key_prefix column length to accommodate display format (lck_XXXXXXXX...)
ALTER TABLE liveconnect_embed_keys
    ALTER COLUMN key_prefix TYPE VARCHAR(20);

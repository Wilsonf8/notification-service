-- Add widget customization columns to liveconnect_settings
ALTER TABLE liveconnect_settings
    ADD COLUMN background_color VARCHAR(7) NOT NULL DEFAULT '#0c0a09',
    ADD COLUMN text_color VARCHAR(7) NOT NULL DEFAULT '#fafaf9',
    ADD COLUMN border_radius INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN font_family VARCHAR(50) NOT NULL DEFAULT 'JetBrains Mono';

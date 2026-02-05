-- Remove NotifyKit/Telegram tables (clean slate)
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS api_keys CASCADE;
DROP TABLE IF EXISTS connect_tokens CASCADE;
DROP TABLE IF EXISTS telegram_destinations CASCADE;

-- Delete NotifyKit projects (no longer needed)
DELETE FROM projects WHERE type = 'NOTIFYKIT';

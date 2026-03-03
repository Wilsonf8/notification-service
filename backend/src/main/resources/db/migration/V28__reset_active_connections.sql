-- Reset stale active_connections values caused by session tracking bugs
-- (decorated session identity mismatch + cross-project counting).
-- All connections are re-established on next connect, so resetting to 0 is safe.
UPDATE liveconnect_reps SET active_connections = 0;
UPDATE liveconnect_visitors SET active_connections = 0;

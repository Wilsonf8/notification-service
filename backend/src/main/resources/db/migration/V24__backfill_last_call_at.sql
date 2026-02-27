-- Backfill last_call_at from existing VIDEO_CALL conversations
UPDATE liveconnect_visitors v
SET last_call_at = sub.max_started
FROM (
    SELECT c.visitor_id, MAX(c.started_at) AS max_started
    FROM liveconnect_conversations c
    WHERE c.type = 'VIDEO_CALL'
    GROUP BY c.visitor_id
) sub
WHERE v.id = sub.visitor_id;

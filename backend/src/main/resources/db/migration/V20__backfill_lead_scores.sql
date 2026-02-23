-- Backfill lead scores for existing visitors using the same formula as
-- LiveConnectCrmService.calculateLeadScore():
--   score = min(100, (visits_last_7d * 5) + recency_bonus)
UPDATE liveconnect_visitors v
SET lead_score = LEAST(100,
    (SELECT COUNT(*) FROM liveconnect_visitor_visits vv
     WHERE vv.visitor_id = v.id
     AND vv.started_at > NOW() - INTERVAL '7 days') * 5
    + CASE
        WHEN v.last_seen_at > NOW() - INTERVAL '1 hour' THEN 25
        WHEN v.last_seen_at > NOW() - INTERVAL '24 hours' THEN 15
        WHEN v.last_seen_at > NOW() - INTERVAL '3 days' THEN 10
        WHEN v.last_seen_at > NOW() - INTERVAL '7 days' THEN 5
        ELSE 0
      END
);

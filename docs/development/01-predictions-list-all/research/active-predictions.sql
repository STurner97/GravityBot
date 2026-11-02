-- R4: how many predictions are active, how long their text is, and how fast they grow.
-- Read-only: every statement is a SELECT and changes no rows.

-- 1. Active predictions now, and the longest text an entry can carry.
SELECT COUNT(*)                                                       AS active_predictions,
       MAX(LENGTH(question))                                          AS longest_question,
       MAX(LENGTH(array_to_string(options, ', ')))                    AS longest_options_text,
       MAX(LENGTH(question) + LENGTH(array_to_string(options, ', '))) AS longest_entry_text
FROM predictions
WHERE resolved = FALSE;

-- 2. Predictions created per month this year, and how many of each month are still active.
SELECT date_trunc('month', created_at)::date      AS month,
       COUNT(*)                                   AS created,
       COUNT(*) FILTER (WHERE resolved = FALSE)   AS still_active
FROM predictions
WHERE created_at >= date_trunc('year', NOW())
GROUP BY 1
ORDER BY 1;

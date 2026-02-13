-- Migration: Fix meal history duplicates and remove the old archive trigger
-- This migration:
--   1. Removes duplicate history entries (keeps only the latest per date, preserving comments)
--   2. Drops the old trigger that was causing duplicates
--   3. Archiving is now handled server-side on a schedule

-- Step 1: For dates with duplicates, keep the row that has a comment (if any), otherwise keep the latest
-- First, prefer rows with comments over rows without
DELETE FROM meal_history
WHERE id NOT IN (
    -- For each date, pick the best row:
    -- prefer the one with a comment, otherwise the one with the highest id
    SELECT id FROM (
        SELECT id, date, comment,
               ROW_NUMBER() OVER (
                   PARTITION BY date
                   ORDER BY 
                       CASE WHEN comment IS NOT NULL AND comment != '' THEN 0 ELSE 1 END,
                       id DESC
               ) AS rn
        FROM meal_history
    )
    WHERE rn = 1
);

-- Step 2: Drop the old trigger that was creating duplicates
DROP TRIGGER IF EXISTS archive_to_history_on_update;

-- Verify: check for any remaining duplicates (should return 0)
-- SELECT date, COUNT(*) as cnt FROM meal_history GROUP BY date HAVING cnt > 1;

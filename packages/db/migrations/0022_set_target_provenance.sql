ALTER TABLE sets
  ADD COLUMN IF NOT EXISTS original_target_reps integer,
  ADD COLUMN IF NOT EXISTS original_target_weight_lbs numeric(6, 2),
  ADD COLUMN IF NOT EXISTS adaptation_reason text;

UPDATE sets
SET original_target_reps = target_reps,
    original_target_weight_lbs = target_weight_lbs
WHERE original_target_reps IS NULL
  AND original_target_weight_lbs IS NULL;

ALTER TABLE sets
  ADD COLUMN IF NOT EXISTS previous_actual_reps integer,
  ADD COLUMN IF NOT EXISTS previous_actual_weight_lbs numeric(6,2);

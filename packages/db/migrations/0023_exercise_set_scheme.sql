DO $$ BEGIN
  CREATE TYPE exercise_set_scheme AS ENUM ('straight', 'ascending_pyramid', 'reverse_pyramid', 'amrap', 'drop_multi_tier');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE workout_template_exercise_entries
  ADD COLUMN IF NOT EXISTS set_scheme exercise_set_scheme NOT NULL DEFAULT 'straight';

alter table workout_template_exercise_entries
  add column if not exists deleted_at timestamptz;

create index if not exists idx_workout_template_exercise_entries_active_template
  on workout_template_exercise_entries(workout_template_id)
  where deleted_at is null;


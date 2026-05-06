alter table workout_template_exercise_entries
  add column if not exists rep_target_text text;

alter table workout_template_exercise_entries
  add column if not exists target_weight_lbs numeric(6,2);

alter table workout_template_exercise_entries
  add column if not exists notes text;

alter table workout_template_exercise_entries
  add column if not exists set_targets jsonb;


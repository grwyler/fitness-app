do $$ begin
  create type progression_strategy as enum (
    'fixed_weight',
    'double_progression',
    'bodyweight_reps',
    'bodyweight_weighted',
    'no_progression'
  );
exception
  when duplicate_object then null;
end $$;

alter table workout_template_exercise_entries
  add column if not exists progression_strategy progression_strategy;


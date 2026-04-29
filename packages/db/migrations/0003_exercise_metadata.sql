alter table exercises
  add column if not exists default_target_sets integer;

alter table exercises
  add column if not exists default_target_reps integer;

alter table exercises
  add column if not exists is_bodyweight boolean not null default false;

alter table exercises
  add column if not exists is_weight_optional boolean not null default false;

alter table exercises
  add column if not exists is_progression_eligible boolean not null default true;

alter table exercises
  add constraint chk_exercises_default_target_sets_positive
  check (default_target_sets is null or default_target_sets > 0);

alter table exercises
  add constraint chk_exercises_default_target_reps_positive
  check (default_target_reps is null or default_target_reps > 0);


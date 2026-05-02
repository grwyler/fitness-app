do $$ begin
  create type bodyweight_progression_mode as enum ('auto', 'reps', 'weighted');
exception
  when duplicate_object then null;
end $$;

create table if not exists user_exercise_progression_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  exercise_id uuid not null references exercises(id),
  progression_strategy progression_strategy,
  rep_range_min integer,
  rep_range_max integer,
  increment_override_lbs numeric(5,2),
  max_jump_per_session_lbs numeric(6,2),
  bodyweight_progression_mode bodyweight_progression_mode,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_user_exercise_progression_rep_range_valid check (
    (rep_range_min is null and rep_range_max is null)
    or (
      rep_range_min is not null
      and rep_range_max is not null
      and rep_range_min > 0
      and rep_range_max >= rep_range_min
    )
  ),
  constraint chk_user_exercise_progression_increment_positive check (increment_override_lbs is null or increment_override_lbs > 0),
  constraint chk_user_exercise_progression_max_jump_positive check (max_jump_per_session_lbs is null or max_jump_per_session_lbs > 0)
);

create unique index if not exists idx_user_exercise_progression_unique on user_exercise_progression_settings(user_id, exercise_id);
create index if not exists idx_user_exercise_progression_user_id on user_exercise_progression_settings(user_id);
create index if not exists idx_user_exercise_progression_exercise_id on user_exercise_progression_settings(exercise_id);


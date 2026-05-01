create table if not exists progression_states_v2 (
  id uuid primary key,
  user_id uuid not null references users(id),
  workout_template_exercise_entry_id uuid not null references workout_template_exercise_entries(id),
  current_weight_lbs numeric(6,2) not null,
  last_completed_weight_lbs numeric(6,2),
  rep_goal integer not null,
  rep_range_min integer not null,
  rep_range_max integer not null,
  consecutive_failures integer not null default 0,
  last_effort_feedback text,
  last_performed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_progression_states_v2_current_weight check (current_weight_lbs >= 0),
  constraint chk_progression_states_v2_rep_range_min check (rep_range_min > 0),
  constraint chk_progression_states_v2_rep_range_max check (rep_range_max >= rep_range_min),
  constraint chk_progression_states_v2_rep_goal check (rep_goal between rep_range_min and rep_range_max)
);

create unique index if not exists idx_progression_states_v2_user_template_entry
  on progression_states_v2(user_id, workout_template_exercise_entry_id);

create index if not exists idx_progression_states_v2_user_id
  on progression_states_v2(user_id);

create index if not exists idx_progression_states_v2_template_entry_id
  on progression_states_v2(workout_template_exercise_entry_id);

alter table exercise_entries
  add column if not exists workout_template_exercise_entry_id uuid references workout_template_exercise_entries(id);

create index if not exists idx_exercise_entries_template_entry_id
  on exercise_entries(workout_template_exercise_entry_id);


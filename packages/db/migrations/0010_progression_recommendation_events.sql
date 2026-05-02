create table if not exists progression_recommendation_events (
  id uuid primary key,
  user_id uuid not null references users(id),
  exercise_id uuid references exercises(id),
  workout_template_exercise_entry_id uuid references workout_template_exercise_entries(id),
  workout_session_id uuid not null references workout_sessions(id),
  exercise_entry_id uuid not null references exercise_entries(id),
  previous_weight_lbs numeric(6,2) not null,
  next_weight_lbs numeric(6,2) not null,
  previous_rep_goal integer,
  next_rep_goal integer,
  result text not null,
  reason text not null,
  confidence text not null,
  reason_codes jsonb not null,
  evidence jsonb not null,
  input_snapshot jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_progression_recommendation_events_user_id
  on progression_recommendation_events(user_id);

create index if not exists idx_progression_recommendation_events_session_id
  on progression_recommendation_events(workout_session_id);

create index if not exists idx_progression_recommendation_events_exercise_id
  on progression_recommendation_events(exercise_id);

create index if not exists idx_progression_recommendation_events_template_entry_id
  on progression_recommendation_events(workout_template_exercise_entry_id);


do $$ begin
  create type program_training_context_source as enum ('manual', 'predefined', 'guided');
exception
  when duplicate_object then null;
end $$;

create table if not exists program_training_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  program_id uuid not null references programs(id),
  enrollment_id uuid references user_program_enrollments(id),
  source program_training_context_source not null,
  goal_type training_goal,
  experience_level difficulty_level,
  progression_preferences_snapshot jsonb not null,
  recovery_preferences_snapshot jsonb not null,
  equipment_settings_snapshot jsonb not null,
  exercise_progression_settings_snapshot jsonb not null,
  coaching_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_program_training_contexts_user_id on program_training_contexts(user_id);
create index if not exists idx_program_training_contexts_program_id on program_training_contexts(program_id);
create index if not exists idx_program_training_contexts_enrollment_id on program_training_contexts(enrollment_id);
create index if not exists idx_program_training_contexts_user_program on program_training_contexts(user_id, program_id);


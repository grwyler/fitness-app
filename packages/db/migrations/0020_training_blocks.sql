do $$ begin
  create type training_block_source as enum ('manual');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type training_block_status as enum ('active', 'completed', 'paused', 'abandoned');
exception
  when duplicate_object then null;
end $$;

create table if not exists training_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  program_id uuid not null references programs(id),
  program_training_context_id uuid references program_training_contexts(id),
  name text not null,
  goal_type training_goal,
  source training_block_source not null default 'manual',
  status training_block_status not null default 'active',
  start_date timestamptz not null default now(),
  planned_weeks integer not null,
  target_workouts_per_week integer not null,
  progression_style progression_aggressiveness,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_training_blocks_user_id on training_blocks(user_id);
create index if not exists idx_training_blocks_program_id on training_blocks(program_id);
create index if not exists idx_training_blocks_user_program on training_blocks(user_id, program_id);
create index if not exists idx_training_blocks_status on training_blocks(status);
create unique index if not exists idx_training_blocks_one_active on training_blocks(user_id, program_id)
  where status = 'active';


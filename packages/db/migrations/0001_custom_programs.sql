do $$
begin
  create type program_source as enum ('predefined', 'custom');
exception
  when duplicate_object then null;
end $$;

alter table programs
  add column if not exists user_id uuid references users(id);

alter table programs
  add column if not exists source program_source not null default 'predefined';

create index if not exists idx_programs_user_source
  on programs(user_id, source);

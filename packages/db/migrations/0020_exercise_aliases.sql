create table if not exists exercise_aliases (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references exercises(id),
  alias text not null,
  alias_normalized text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_exercise_aliases_exercise_id
  on exercise_aliases(exercise_id);

create index if not exists idx_exercise_aliases_alias_normalized
  on exercise_aliases(alias_normalized);

create unique index if not exists idx_exercise_aliases_exercise_normalized_unique
  on exercise_aliases(exercise_id, alias_normalized);


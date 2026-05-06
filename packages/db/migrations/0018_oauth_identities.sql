-- OAuth identities + state tracking for third-party sign in/up (Google, Facebook).
-- Safe to run multiple times.

do $$ begin
  create type oauth_provider as enum ('google', 'facebook');
exception
  when duplicate_object then null;
end $$;

create table if not exists user_oauth_identities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  provider oauth_provider not null,
  provider_user_id text not null,
  email text,
  email_verified boolean not null default false,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_user_oauth_identities_provider_user
  on user_oauth_identities(provider, provider_user_id);
create unique index if not exists idx_user_oauth_identities_user_provider
  on user_oauth_identities(user_id, provider);
create index if not exists idx_user_oauth_identities_user_id
  on user_oauth_identities(user_id);

create table if not exists oauth_states (
  id uuid primary key default gen_random_uuid(),
  provider oauth_provider not null,
  intent text,
  state_hash text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_oauth_states_state_hash
  on oauth_states(state_hash);
create index if not exists idx_oauth_states_expires_at
  on oauth_states(expires_at);


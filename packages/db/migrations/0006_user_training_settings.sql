do $$ begin
  create type progression_aggressiveness as enum ('conservative', 'balanced', 'aggressive');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type progression_confidence as enum ('low', 'medium', 'high');
exception
  when duplicate_object then null;
end $$;

create table if not exists user_training_settings (
  user_id uuid primary key references users(id),
  progression_aggressiveness progression_aggressiveness not null default 'balanced',
  default_barbell_increment_lbs numeric(5,2) not null default 5,
  default_dumbbell_increment_lbs numeric(5,2) not null default 5,
  default_machine_increment_lbs numeric(5,2) not null default 10,
  default_cable_increment_lbs numeric(5,2) not null default 5,
  use_recovery_adjustments boolean not null default true,
  default_recovery_state recovery_state not null default 'normal',
  allow_auto_deload boolean not null default true,
  allow_recalibration boolean not null default true,
  prefer_rep_progression_before_weight boolean not null default true,
  minimum_confidence_for_increase progression_confidence not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_training_settings_user_id on user_training_settings(user_id);


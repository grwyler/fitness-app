-- Add optional per-set effort logging (RIR + failure status) for trust/progression improvements.
-- Safe to run multiple times.

do $$
begin
  create type set_rir as enum ('rir_0', 'rir_1', 'rir_2', 'rir_3', 'rir_4', 'rir_5_plus');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type set_failure_status as enum ('muscular_failure', 'technical_failure', 'stopped_early');
exception
  when duplicate_object then null;
end $$;

alter table sets
  add column if not exists rir set_rir,
  add column if not exists failure_status set_failure_status;


-- Exercise logging modalities + cardio/conditioning set fields (MVP).
-- Keeps existing reps/load logging intact while allowing optional time/distance/rounds logging.

do $$
begin
  create type exercise_logging_modality as enum (
    'reps_load',
    'reps_only',
    'time',
    'time_distance',
    'distance',
    'interval',
    'hold'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type workout_set_type as enum ('working', 'warmup');
exception
  when duplicate_object then null;
end $$;

alter table exercises
  add column if not exists logging_modality exercise_logging_modality not null default 'reps_load';

-- Template entries: allow non-rep prescriptions by making target_reps optional.
alter table workout_template_exercise_entries
  alter column target_reps drop not null;

alter table workout_template_exercise_entries
  drop constraint if exists chk_workout_template_target_reps;

alter table workout_template_exercise_entries
  add constraint chk_workout_template_target_reps
  check (target_reps is null or target_reps > 0);

alter table workout_template_exercise_entries
  drop constraint if exists chk_workout_template_rep_range_valid;

alter table workout_template_exercise_entries
  add constraint chk_workout_template_rep_range_valid
  check (
    (rep_range_min is null and rep_range_max is null)
    or (
      target_reps is not null
      and rep_range_min is not null
      and rep_range_max is not null
      and rep_range_min > 0
      and rep_range_max >= rep_range_min
      and target_reps between rep_range_min and rep_range_max
    )
  );

-- Exercise entries: allow non-rep prescriptions and snapshot modality for stable history display.
alter table exercise_entries
  add column if not exists logging_modality_snapshot exercise_logging_modality not null default 'reps_load';

alter table exercise_entries
  alter column target_reps drop not null,
  alter column target_weight_lbs drop not null;

alter table exercise_entries
  add column if not exists target_duration_seconds integer,
  add column if not exists target_distance_meters numeric(10, 2),
  add column if not exists target_rounds integer;

alter table exercise_entries
  drop constraint if exists chk_exercise_entries_target_reps;

alter table exercise_entries
  add constraint chk_exercise_entries_target_reps
  check (target_reps is null or target_reps > 0);

alter table exercise_entries
  drop constraint if exists chk_exercise_entries_target_weight;

alter table exercise_entries
  add constraint chk_exercise_entries_target_weight
  check (target_weight_lbs is null or target_weight_lbs >= 0);

alter table exercise_entries
  drop constraint if exists chk_exercise_entries_target_duration_seconds;

alter table exercise_entries
  add constraint chk_exercise_entries_target_duration_seconds
  check (target_duration_seconds is null or target_duration_seconds > 0);

alter table exercise_entries
  drop constraint if exists chk_exercise_entries_target_distance_meters;

alter table exercise_entries
  add constraint chk_exercise_entries_target_distance_meters
  check (target_distance_meters is null or target_distance_meters >= 0);

alter table exercise_entries
  drop constraint if exists chk_exercise_entries_target_rounds;

alter table exercise_entries
  add constraint chk_exercise_entries_target_rounds
  check (target_rounds is null or target_rounds > 0);

-- Sets: optional reps/load plus optional time/distance/rounds.
alter table sets
  add column if not exists set_type workout_set_type not null default 'working';

alter table sets
  alter column target_reps drop not null,
  alter column target_weight_lbs drop not null;

alter table sets
  add column if not exists target_duration_seconds integer,
  add column if not exists actual_duration_seconds integer,
  add column if not exists target_distance_meters numeric(10, 2),
  add column if not exists actual_distance_meters numeric(10, 2),
  add column if not exists target_rounds integer,
  add column if not exists actual_rounds integer;

alter table sets
  drop constraint if exists chk_sets_target_reps;

alter table sets
  add constraint chk_sets_target_reps
  check (target_reps is null or target_reps > 0);

alter table sets
  drop constraint if exists chk_sets_target_weight;

alter table sets
  add constraint chk_sets_target_weight
  check (target_weight_lbs is null or target_weight_lbs >= 0);

alter table sets
  drop constraint if exists chk_sets_target_duration_seconds;

alter table sets
  add constraint chk_sets_target_duration_seconds
  check (target_duration_seconds is null or target_duration_seconds > 0);

alter table sets
  drop constraint if exists chk_sets_actual_duration_seconds;

alter table sets
  add constraint chk_sets_actual_duration_seconds
  check (actual_duration_seconds is null or actual_duration_seconds > 0);

alter table sets
  drop constraint if exists chk_sets_target_distance_meters;

alter table sets
  add constraint chk_sets_target_distance_meters
  check (target_distance_meters is null or target_distance_meters >= 0);

alter table sets
  drop constraint if exists chk_sets_actual_distance_meters;

alter table sets
  add constraint chk_sets_actual_distance_meters
  check (actual_distance_meters is null or actual_distance_meters >= 0);

alter table sets
  drop constraint if exists chk_sets_target_rounds;

alter table sets
  add constraint chk_sets_target_rounds
  check (target_rounds is null or target_rounds > 0);

alter table sets
  drop constraint if exists chk_sets_actual_rounds;

alter table sets
  add constraint chk_sets_actual_rounds
  check (actual_rounds is null or actual_rounds > 0);


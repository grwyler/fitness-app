-- Cardio category + template-level time/distance/round targets (MVP follow-up).

-- Add 'cardio' to exercise_category enum (used by exercises + snapshots).
do $$
begin
  -- Some environments may still have `exercises.category` as text (no enum type yet).
  -- In that case, skip the enum update rather than failing the migration.
  if to_regtype('exercise_category') is not null then
    if not exists (
      select 1
      from pg_enum e
      where e.enumtypid = to_regtype('exercise_category')
        and e.enumlabel = 'cardio'
    ) then
      alter type exercise_category add value 'cardio';
    end if;
  end if;
end $$;

-- Allow templates to prescribe non-rep targets directly (without requiring set_targets).
alter table workout_template_exercise_entries
  add column if not exists target_duration_seconds integer,
  add column if not exists target_distance_meters numeric(10, 2),
  add column if not exists target_rounds integer;

alter table workout_template_exercise_entries
  drop constraint if exists chk_workout_template_target_duration_seconds;

alter table workout_template_exercise_entries
  add constraint chk_workout_template_target_duration_seconds
  check (target_duration_seconds is null or target_duration_seconds > 0);

alter table workout_template_exercise_entries
  drop constraint if exists chk_workout_template_target_distance_meters;

alter table workout_template_exercise_entries
  add constraint chk_workout_template_target_distance_meters
  check (target_distance_meters is null or target_distance_meters >= 0);

alter table workout_template_exercise_entries
  drop constraint if exists chk_workout_template_target_rounds;

alter table workout_template_exercise_entries
  add constraint chk_workout_template_target_rounds
  check (target_rounds is null or target_rounds > 0);

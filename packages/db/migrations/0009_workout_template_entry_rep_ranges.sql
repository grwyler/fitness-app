alter table workout_template_exercise_entries
  add column if not exists rep_range_min integer;

alter table workout_template_exercise_entries
  add column if not exists rep_range_max integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_workout_template_rep_range_valid'
  ) then
    alter table workout_template_exercise_entries
      add constraint chk_workout_template_rep_range_valid
      check (
        (rep_range_min is null and rep_range_max is null)
        or (
          rep_range_min is not null
          and rep_range_max is not null
          and rep_range_min > 0
          and rep_range_max >= rep_range_min
          and target_reps between rep_range_min and rep_range_max
        )
      );
  end if;
end $$;


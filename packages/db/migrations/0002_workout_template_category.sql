alter table workout_templates
  add column if not exists category text not null default 'Full Body';

update workout_templates
set category = case
  when name in ('Day 1 - Upper Strength', 'Push Strength', 'Push Hypertrophy') then 'Push'
  when name in ('Day 2 - Lower', 'Legs Strength', 'Legs Volume') then 'Legs'
  when name in ('Day 3 - Upper Arms Focus', 'Pull + Arms', 'Pull Hypertrophy') then 'Pull'
  when name in ('Day 4 - Arms Quick', 'Quick Arms', 'Quick Full Body') then 'Quick'
  else 'Full Body'
end
where name in (
  'Workout A',
  'Workout B',
  'Full Body Strength',
  'Full Body Posterior Chain',
  'Day 1 - Upper Strength',
  'Push Strength',
  'Push Hypertrophy',
  'Day 2 - Lower',
  'Legs Strength',
  'Legs Volume',
  'Day 3 - Upper Arms Focus',
  'Pull + Arms',
  'Pull Hypertrophy',
  'Day 4 - Arms Quick',
  'Quick Arms',
  'Quick Full Body'
);

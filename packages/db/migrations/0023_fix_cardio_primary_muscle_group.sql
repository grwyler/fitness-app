-- Avoid displaying duplicate "cardio - cardio" tags in the UI:
-- keep `category = cardio` but use a more descriptive `primary_muscle_group`.

update exercises
set primary_muscle_group = 'conditioning'
where category = 'cardio'
  and primary_muscle_group = 'cardio';


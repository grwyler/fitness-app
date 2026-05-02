do $$
begin
  create type training_goal as enum (
    'strength',
    'hypertrophy',
    'general_fitness',
    'endurance',
    'maintenance'
  );
exception
  when duplicate_object then null;
end $$;

alter table users
  add column if not exists training_goal training_goal;

alter table programs
  add column if not exists training_goal training_goal;


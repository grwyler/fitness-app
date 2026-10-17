do $$
begin
  alter type training_goal add value if not exists 'consistency';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type training_goal add value if not exists 'sport_support';
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter type training_goal add value if not exists 'custom';
exception
  when duplicate_object then null;
end $$;


alter table users
  add column if not exists tokens_invalid_before timestamptz;


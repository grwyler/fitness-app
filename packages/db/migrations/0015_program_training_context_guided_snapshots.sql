alter table if exists program_training_contexts
  add column if not exists guided_answers_snapshot jsonb;

alter table if exists program_training_contexts
  add column if not exists guided_recommendation_snapshot jsonb;


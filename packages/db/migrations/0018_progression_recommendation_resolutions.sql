alter table progression_recommendation_events
  add column if not exists resolution_type text not null default 'unresolved',
  add column if not exists resolved_by_user_id uuid references users(id),
  add column if not exists resolved_at timestamptz,
  add column if not exists resolution_note text,
  add column if not exists resolution_original_snapshot jsonb,
  add column if not exists resolution_final_snapshot jsonb,
  add column if not exists resolution_related_set_ids jsonb;

create index if not exists idx_progression_recommendation_events_resolution_type
  on progression_recommendation_events(resolution_type);

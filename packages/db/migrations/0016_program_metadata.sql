-- Add structured metadata to predefined programs for guided matching/review.
-- Safe to run multiple times.

alter table programs
  add column if not exists metadata jsonb;

-- Optional but useful for future filtering/search.
create index if not exists idx_programs_metadata_gin
  on programs using gin (metadata);


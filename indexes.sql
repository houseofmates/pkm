-- connect to nocobase postgres (adjust port/user/pass from docker-compose)
-- psql -h localhost -p 5432 -U nocobase_user -d nocobase

-- pkm canvases: title + updated for list/sort
create index concurrently if not exists idx_pkm_canvases_title_updated 
on pkm_canvases (lower(title), updated_at desc);

-- notes: entity_type + updated for pk m notes
create index concurrently if not exists idx_notes_entity_updated 
on notes (entity_type, updated_at desc);

-- general pk m tables: updated_at desc for feeds
create index concurrently if not exists idx_pkm_updated 
on notes (updated_at desc) where entity_type like 'pkm%';

-- vacuum analyze
vacuum analyze pkm_canvases;
vacuum analyze notes;

-- verify
\d pkm_canvases
explain analyze select * from pkm_canvases order by lower(title), updated_at desc limit 20;

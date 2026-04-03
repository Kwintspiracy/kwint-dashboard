-- Migration: entity_llm_keys
-- Stores per-entity API keys for LLM providers (Anthropic, OpenAI, Google, etc.)

create table if not exists entity_llm_keys (
  id          uuid        primary key default gen_random_uuid(),
  entity_id   uuid        not null references entities(id) on delete cascade,
  provider    text        not null,
  api_key     text        not null default '',
  base_url    text,
  nickname    text,
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique(entity_id, provider)
);

-- RLS: only entity members can read/write their own keys
alter table entity_llm_keys enable row level security;

create policy "entity_llm_keys_member_access"
  on entity_llm_keys
  using (
    exists (
      select 1 from entity_members
      where entity_members.entity_id = entity_llm_keys.entity_id
        and entity_members.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from entity_members
      where entity_members.entity_id = entity_llm_keys.entity_id
        and entity_members.user_id = auth.uid()
    )
  );

-- Auto-update updated_at
create trigger set_updated_at_entity_llm_keys
  before update on entity_llm_keys
  for each row execute function moddatetime(updated_at);

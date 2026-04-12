-- Migration: user_profiles
-- Per-user profile info (name, avatar, timezone, locale). One row per auth user.

create table if not exists user_profiles (
  user_id       uuid        primary key references auth.users(id) on delete cascade,
  display_name  text,
  avatar_url    text,
  timezone      text        not null default 'UTC',
  locale        text        not null default 'en',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- RLS: users can only read/write their own profile
alter table user_profiles enable row level security;

create policy "user_profiles_self_read"
  on user_profiles for select
  using (user_id = auth.uid());

create policy "user_profiles_self_write"
  on user_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Auto-update updated_at
create trigger set_updated_at_user_profiles
  before update on user_profiles
  for each row execute function set_updated_at();

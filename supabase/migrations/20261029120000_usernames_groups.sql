-- Usernames, groups (public / private), invitations and group chat.
-- As with players, only the `api` Edge Function (service role) reads or
-- writes these tables.

alter table public.players add column if not exists username text
  check (username ~ '^[a-z][a-z0-9_.]{2,19}$');
create unique index if not exists players_username_key on public.players (username);

create table if not exists public.groups (
  id          bigint generated always as identity primary key,
  name        text        not null check (char_length(name) between 3 and 30),
  description text        not null default '' check (char_length(description) <= 140),
  visibility  text        not null check (visibility in ('public', 'private')),
  owner_id    bigint      not null references public.players (id) on delete cascade,
  -- secret part of the realtime channel name, only given to members
  channel_key text        not null default replace(gen_random_uuid()::text, '-', ''),
  created_at  timestamptz not null default now()
);
create index if not exists groups_public_idx on public.groups (visibility, created_at desc);

create table if not exists public.group_members (
  group_id  bigint      not null references public.groups (id) on delete cascade,
  player_id bigint      not null references public.players (id) on delete cascade,
  role      text        not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, player_id)
);
create index if not exists group_members_player_idx on public.group_members (player_id);

create table if not exists public.group_invites (
  id         bigint generated always as identity primary key,
  group_id   bigint      not null references public.groups (id) on delete cascade,
  from_id    bigint      not null references public.players (id) on delete cascade,
  to_id      bigint      not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, to_id)
);
create index if not exists group_invites_to_idx on public.group_invites (to_id);

create table if not exists public.group_messages (
  id         bigint generated always as identity primary key,
  group_id   bigint      not null references public.groups (id) on delete cascade,
  player_id  bigint      not null references public.players (id) on delete cascade,
  text       text        not null check (char_length(text) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists group_messages_group_idx on public.group_messages (group_id, id desc);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invites enable row level security;
alter table public.group_messages enable row level security;
revoke all on public.groups, public.group_members, public.group_invites, public.group_messages from anon, authenticated;

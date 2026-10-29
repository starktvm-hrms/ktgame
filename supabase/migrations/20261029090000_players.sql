-- Kerala Explorer on Supabase: player accounts, saved progress and the
-- helpers the `api` Edge Function uses. Only that function (service role)
-- touches these tables; browsers never read them directly.

create table if not exists public.players (
  id          bigint generated always as identity primary key,
  name        text        not null check (char_length(name) between 2 and 24),
  phone       text        not null unique,      -- E.164, e.g. +919876543210
  pass_hash   text        not null,             -- pbkdf2$iterations$salt$key
  created_at  timestamptz not null default now(),
  last_login  timestamptz not null default now(),
  last_seen   timestamptz,                      -- updated while playing (online count)
  character   jsonb,                            -- avatar look
  progress    jsonb                             -- saved game
);
create index if not exists players_last_seen_idx on public.players (last_seen);

alter table public.players enable row level security;
revoke all on public.players from anon, authenticated;

-- Fixed-window rate limiting for sign-up and log-in.
create table if not exists public.rate_hits (
  key          text primary key,
  window_start timestamptz not null,
  hits         integer     not null
);
alter table public.rate_hits enable row level security;
revoke all on public.rate_hits from anon, authenticated;

create or replace function public.kt_rate_hit(p_key text, p_window integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.rate_hits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window) then now() else r.window_start end
  returning hits into n;
  -- occasional cleanup of old windows
  if random() < 0.01 then
    delete from public.rate_hits where window_start < now() - interval '1 day';
  end if;
  return n;
end;
$$;

create or replace function public.kt_online(p_secs integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.players where last_seen > now() - make_interval(secs => p_secs);
$$;

revoke execute on function public.kt_rate_hit(text, integer) from public, anon, authenticated;
revoke execute on function public.kt_online(integer) from public, anon, authenticated;
grant execute on function public.kt_rate_hit(text, integer) to service_role;
grant execute on function public.kt_online(integer) to service_role;

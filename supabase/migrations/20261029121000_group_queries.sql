-- One-query helpers for the groups screens.

-- My groups with member counts and the newest message id (for unread badges).
create or replace function public.kt_my_groups(p_uid bigint)
returns table (id bigint, name text, description text, visibility text, owner_id bigint, channel_key text,
               created_at timestamptz, role text, member_count bigint, last_message_id bigint)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.description, g.visibility, g.owner_id, g.channel_key, g.created_at, m.role,
         (select count(*) from public.group_members mm where mm.group_id = g.id),
         (select max(gm.id) from public.group_messages gm where gm.group_id = g.id)
  from public.group_members m
  join public.groups g on g.id = m.group_id
  where m.player_id = p_uid
  order by g.name;
$$;

-- Public groups to browse, biggest first, optionally filtered by name.
create or replace function public.kt_public_groups(p_q text, p_uid bigint)
returns table (id bigint, name text, description text, visibility text, owner_id bigint,
               created_at timestamptz, member_count bigint, joined boolean)
language sql stable security definer set search_path = public as $$
  select g.id, g.name, g.description, g.visibility, g.owner_id, g.created_at,
         (select count(*) from public.group_members mm where mm.group_id = g.id) as member_count,
         exists (select 1 from public.group_members me where me.group_id = g.id and me.player_id = p_uid)
  from public.groups g
  where g.visibility = 'public' and (coalesce(p_q, '') = '' or g.name ilike '%' || p_q || '%')
  order by member_count desc, g.created_at desc
  limit 30;
$$;

revoke execute on function public.kt_my_groups(bigint) from public, anon, authenticated;
revoke execute on function public.kt_public_groups(text, bigint) from public, anon, authenticated;
grant execute on function public.kt_my_groups(bigint) to service_role;
grant execute on function public.kt_public_groups(text, bigint) to service_role;

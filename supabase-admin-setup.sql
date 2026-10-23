-- Youth Parliament Ghana Ministry admin access
-- Review your existing table columns before running. This script adds an explicit admin allow-list.
-- Run in Supabase Dashboard > SQL Editor. Do NOT expose a service_role key in the website.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

-- Users can check only whether their own account is in the allow-list.
drop policy if exists "admins can read own admin membership" on public.admin_users;
create policy "admins can read own admin membership"
on public.admin_users for select to authenticated
using (user_id = auth.uid());

create or replace function public.is_ministry_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_ministry_admin() from public;
grant execute on function public.is_ministry_admin() to authenticated;

-- IMPORTANT:
-- After you confirm the exact columns in announcements and contact_messages,
-- enable RLS and replace any permissive write policies with policies using
-- public.is_ministry_admin(). Do not blindly drop policies on a live site.
-- Suggested admin-only policies (adjust table names/operations if necessary):
alter table public.announcements enable row level security;
drop policy if exists "ministry admins manage announcements" on public.announcements;
create policy "ministry admins manage announcements"
on public.announcements for all to authenticated
using (public.is_ministry_admin())
with check (public.is_ministry_admin());

alter table public.contact_messages enable row level security;
drop policy if exists "ministry admins read contact messages" on public.contact_messages;
create policy "ministry admins read contact messages"
on public.contact_messages for select to authenticated
using (public.is_ministry_admin());

-- Keep a separate INSERT policy for public contact submissions if your website form uses it.
-- Never create a public SELECT policy on contact_messages.
-- If public visitors need to read published announcements, create a SELECT policy
-- restricted to published rows only, matching your actual published-column name.

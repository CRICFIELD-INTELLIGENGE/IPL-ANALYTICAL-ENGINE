-- Private dashboard storage; applied to cricfield-production.
begin;
create table public.user_workspace (
  user_id uuid primary key references auth.users(id) on delete cascade,
  follows text[] not null default '{}',
  research text not null default '' check(char_length(research)<=20000),
  stats_query text not null default '' check(char_length(stats_query)<=10000),
  arcade_notes text not null default '' check(char_length(arcade_notes)<=10000)
);
alter table public.user_workspace enable row level security;
revoke all on public.user_workspace from anon, authenticated;
grant select,insert,update on public.user_workspace to authenticated;
create policy "Own workspace" on public.user_workspace for all to authenticated
  using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
commit;

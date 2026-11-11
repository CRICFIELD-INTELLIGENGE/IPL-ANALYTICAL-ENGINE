begin;
create table public.saved_feature_data (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null check(feature in ('scout','stats','arcade')),
  payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=500000),
  updated_at timestamptz not null default now(),
  primary key(user_id,feature)
);
alter table public.saved_feature_data enable row level security;
revoke all on public.saved_feature_data from anon, authenticated;
grant select,insert,update,delete on public.saved_feature_data to authenticated;
create policy "Own feature saves" on public.saved_feature_data for all to authenticated
using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
commit;

-- Public aggregate only; no account identities or emails exposed.
create function public.public_registered_count() returns bigint
language sql stable security definer set search_path=''
as $$ select count(*) from auth.users where deleted_at is null and email_confirmed_at is not null $$;
revoke all on function public.public_registered_count() from public;
grant execute on function public.public_registered_count() to anon,authenticated;

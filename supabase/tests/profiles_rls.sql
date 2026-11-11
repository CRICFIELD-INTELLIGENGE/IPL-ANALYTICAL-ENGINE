-- Cross-account isolation check for public.profiles. Run in the SQL editor (or via MCP execute_sql).
-- Creates two throwaway identities, acts as anon / A / B, then ALWAYS aborts with an exception so nothing persists.
-- Expected result: ERROR "ALL_PASSED (rolled back)". Any "FAIL ..." message is a policy regression.
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); n int; ok boolean;
begin
  insert into auth.users(id, aud, role, email, instance_id) values
    (a,'authenticated','authenticated','rls-a-'||a||'@example.invalid','00000000-0000-0000-0000-000000000000'),
    (b,'authenticated','authenticated','rls-b-'||b||'@example.invalid','00000000-0000-0000-0000-000000000000');
  insert into public.profiles(id, display_name) values (a,'A'),(b,'B');

  -- anon: no access at all
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin select count(*) into n from public.profiles; raise exception 'FAIL anon select allowed (%)', n;
  exception when insufficient_privilege then null; end;
  reset role;

  -- user A
  perform set_config('request.jwt.claims', json_build_object('sub',a,'role','authenticated')::text, true);
  set local role authenticated;
  select count(*) into n from public.profiles; if n <> 1 then raise exception 'FAIL A sees % rows', n; end if;
  select count(*) into n from public.profiles where id=b; if n <> 0 then raise exception 'FAIL A sees B'; end if;
  update public.profiles set display_name='hacked' where id=b; get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL A updated B'; end if;
  update public.profiles set display_name='A2' where id=a; get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL A cannot update own'; end if;
  begin update public.profiles set id=b where id=a; raise exception 'FAIL A re-keyed own row to B';
  exception when unique_violation or check_violation or insufficient_privilege then null;
    when others then if sqlerrm like 'new row violates%' then null; else raise; end if; end;
  begin insert into public.profiles(id,display_name) values (gen_random_uuid(),'x'); raise exception 'FAIL A inserted foreign row';
  exception when insufficient_privilege then null; when others then if sqlerrm like 'new row violates%' then null; else raise; end if; end;
  begin delete from public.profiles where id=b; raise exception 'FAIL A delete allowed';
  exception when insufficient_privilege then null; end;
  begin update public.profiles set display_name=repeat('x',81) where id=a; raise exception 'FAIL 81-char name accepted';
  exception when check_violation then null; end;
  reset role;

  -- user B unaffected
  perform set_config('request.jwt.claims', json_build_object('sub',b,'role','authenticated')::text, true);
  set local role authenticated;
  select (display_name='B') into ok from public.profiles where id=b; if not ok then raise exception 'FAIL B row changed'; end if;
  select count(*) into n from public.profiles; if n <> 1 then raise exception 'FAIL B sees % rows', n; end if;
  reset role;

  raise exception 'ALL_PASSED (rolled back)';
end $$;

-- Event-trigger helper stays available to its owner, not the public API roles.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

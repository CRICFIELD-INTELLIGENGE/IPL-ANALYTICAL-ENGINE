## Summary

What changed and why.

## Type of change

- [ ] Bug fix
- [ ] Feature
- [ ] Data / analytics change (warehouse, `public/data`, model snapshot)
- [ ] Refactor / file move (no behaviour change)
- [ ] Documentation

## Checks (see docs/TESTING.md)

- [ ] Typechecks: no new errors compared with the baseline
- [ ] `pnpm --filter @workspace/ipl-analytics run build` passes (Vercel runs this)
- [ ] API tests: no new failures (if API code changed)
- [ ] Desktop and mobile shell checked (if UI changed); screenshots attached

## Data and safety

- [ ] No raw dataset, player ID or database file changed. If one did, the repair plan and before/after checksums are linked.
- [ ] Both copies of any JSON in `api-server/data` and `ipl-analytics/public/data` are updated or explained
- [ ] No `.env`, `env/*.env`, credentials or official challenge data staged
- [ ] No route, URL or API contract changed. If one did, it is listed here.

# Player identity

## Rules

1. **The canonical key is the Cricsheet registry identifier**, an 8-character hex id.
   - Every Cricsheet match file maps each name it uses to this id in `info.registry.people`. Cricsheet documents the ids as stable across matches.
   - `players.cricsheet_id` holds it, and `player_key` is the local integer surrogate.
2. **Cross-league aggregation is an exact join on that id.** A player's IPL, SMAT, BBL, SA20, CPL and ILT20 records connect without any name matching.
3. **Names never merge records.**
   - The same written name can belong to several people. Batch 1 has 11 such groups, for example two different "Yuvraj Singh" and two different "Amit Mishra".
   - They stay separate because their ids differ.
4. **Register data** comes from Cricsheet's `people.csv` and `names.csv`:
   - `name` (not unique) and `unique_name` (unique; use it for display)
   - `key_*` ids on other sites (cricinfo, bcci, pulse, bigbash, …), in `player_source_ids`
   - variant spellings, in `player_names`
5. **Other systems link through `identity_links`,** with source, method, confidence, who decided and when. Methods:
   - `cricsheet_registry`: the other system already stores the Cricsheet id (exact).
   - `people_key`: the other system stores an id that appears in a `key_*` column (exact).
   - `manual`: a reviewed decision from `manifests/identity-decisions.json`.
6. **Anything without an exact id goes to `identity_review_queue`.**
   - Candidates come from exact name equality only: case, dots and repeated spaces are ignored, and nothing else.
   - The match is checked against register names, unique names, `names.csv` variants and names used in match files.
   - Each candidate carries evidence: which name matched, and which competitions and dates they played.

## The IPL warehouse bridge

- `sqlite.db` has 1,141 players.
- **964** store a real Cricsheet id. All 964 are linked exactly.
- **177** have synthetic `json:N` ids. They are squad-only players added from `players.json`, and none has faced or bowled a ball in the warehouse.
  - All 177 are in the review queue.
  - 59 have one or more exact-name candidates; for example, warehouse "Wanindu Hasaranga" has the candidate `a97c8ec2 PWH de Silva` through a `names.csv` variant.
  - 118 have none.

## Recording a decision

Add an entry to `lib/cricket-data/global/manifests/identity-decisions.json`, then run `global:identity`:

```json
{
  "source": "ipl_warehouse",
  "source_key": "966",
  "decision": "link",
  "cricsheet_id": "a97c8ec2",
  "decided_by": "<reviewer>",
  "decided_at": "2026-10-10",
  "note": "names.csv lists 'Wanindu Hasaranga' for PWH de Silva; same franchise and season"
}
```

- Use `"decision": "distinct"` to record that none of the candidates is the same person.
- Decisions live in a tracked file, so they survive a rebuild of `global.db`.

## Reports

`lib/cricket-data/global/reports/identity-<date>.md` lists:

- register coverage
- players per competition
- the cross-league distribution and pair matrix
- players in four or more competitions
- name collisions and name variants
- the bridge statistics and the review queue

The `.json` file next to it has the same content for tooling.

# Player metadata enrichment — source audit

The warehouse contains 18,623 identities. Complete metadata coverage has not been achieved.

This import fetched 49 public Cricbuzz profiles using existing Cricsheet registry source IDs. One profile failed identity parsing and was not imported. Imported metadata has source URLs and retrieval times. Fields are facts from the profile, not inferred from names or league membership. Profile country is not verified citizenship or current IPL eligibility.

The existing cached 2026 auction transcription contains 369 numbered rows. These are not asserted to be the official final pool size: the IPL announcement describes a 350-player list, and direct PDF retrieval returned HTTP403. The importer preserves each row in a separate ledger and marks it unreviewed. 174 row identities matched a unique warehouse name;195 need identity review. No new player identities or match statistics were invented.

Resulting coverage: nationality223; declared role221; batting hand904; bowling style816; date of birth174. Exact source-ID links and unreviewed name links remain distinguishable.

## Files

- player-enrichment-report.json: import outcome and coverage.
- player-metadata-review-queue.csv: missing metadata and available registry source IDs.
- scripts/enrich-player-metadata.py: resumable importer; cached profiles avoid repeat requests.

## Remaining verification

- Acquire identity-linked profiles for remaining players; ESPN profile requests were denied and were not bypassed.
- Obtain accessible official auction PDFs and reconcile the cached transcription's row count and values.
- Review unmatched and ambiguous identities; never match on initials alone.
- Retirement, current fitness, contracts, registration and retention need separate dated evidence. Test/international retirement must not be treated as franchise retirement.
- Preserve conflicts across sources and source confidence; never advertise incomplete coverage as fully verified.

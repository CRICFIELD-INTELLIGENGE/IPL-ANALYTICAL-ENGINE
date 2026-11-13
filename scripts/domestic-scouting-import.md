# Scout Lab domestic import

Run the importer with Python 3.10+ from the repository root. The baseline is a local copy of the existing domestic scorecard SQLite database.

    python scripts/build-domestic-scouting.py --baseline PATH_TO_BASELINE.sqlite --output RELEASE_DIRECTORY --fixtures scripts/domestic-scouting-fixtures.jsonl

Supply additional fixture indexes as JSONL through --fixtures. One row per provider match. Required fields are provider, source_match_id, competition_code, season, format, start_date, team1, team2, status and source_url. Optional fields include end_date, venue, winner and verified_fixture_key. Use the same independently verified fixture key across providers, with consistent match dates, teams and format. Abandoned, no_result, scheduled and unknown rows remain in the registry. Status win, tie, draw or completed is required for player statistics.

The --scorecards input accepts authorized, normalized JSONL from Cricbuzz, ESPNcricinfo, or official providers. Repeat the fixture metadata and supply an innings array with batting_team, bowling_team, runs, wickets, extras, legal_balls, batting and bowling. Each batting row has name, runs, balls, fours, sixes and dismissed (0 or 1). Each bowling row has name, legal_balls, maidens, runs and wickets. Optional fields include source_player_id, dismissal_type, wides and no_balls. The importer does not fetch provider pages. Fixture sources without innings stay visible as discovery only.

Pass official downloaded Cricsheet JSON ZIPs with --cricsheet. Match IDs in the archive must appear as Cricsheet rows in --fixtures, with teams, dates and seasons matching the JSON. Archive deliveries are retained in JSONL where supported. Penalty-run and miscounted-over innings need a separately verified scorecard. Super-over deliveries are outside the imported main-innings totals.

The optional --identity-map CSV has provider, source_player_id, cricfield_player_id and evidence_url. New scorecard rows enter the master only when a provider player ID is verified against an existing canonical player ID. Unresolved scorecard names and match-scoped totals are available in the separate CSV exports.

The optional --edition-evidence CSV has competition_code, calendar_year, edition_status, expected_completed_matches, fixture_list_verified and evidence_url. Use fixture_list_verified=1 only after reconciling an exhaustive fixture manifest. Expected counts stay blank when unverified. A future scheduled start after the cutoff does not imply that the competition was not held in an earlier season.

Input files are the durable checkpoints. The build can be rerun from the same baseline with added or corrected manifests. It never writes to the baseline or deploys data to Scout Lab.

CricHeroes is supported for fixture mapping and authorized normalized scorecards. Verify the organizer, season, teams, venue and format before assigning an official competition code. Store the numeric CricHeroes scorecard ID and use the same verified fixture key as any corroborating provider. The match-sources export retains both provider IDs. CricHeroes player IDs require a separately verified identity mapping.

For Indian domestic scouting, check CricHeroes tournament listings first. Keep Cricsheet for
international and major league archives. Verified domestic fixtures and source IDs go in
domestic-scouting-fixtures.jsonl. A listed match whose scorecard cannot be retrieved remains
fixture-only. Do not infer the outcome, innings, or player statistics from a tournament name
or a broken scorecard link.

Verified tournament listings for discovery:

- 2025 Andhra Premier League, CricHeroes tournament 1580435:
  https://cricheroes.com/tournament/1580435/gmr-andhra-premier-league-2025/matches/past-matches
- ACA Senior Men's One Day Inter-District 2026–27, CricHeroes tournament 1910019:
  https://cricheroes.com/tournament/1910019/aca-sr.-men-one-day-inter-district-2026-27/leaderboard
  This is a separate inter-district competition. It does not count toward Vijay Hazare or APL coverage.

Use the CricHeroes extractor on a public tournament listing or a saved rendered listing.

    python scripts/extract-cricheroes.py --url https://cricheroes.com/tournament/1580435/gmr-andhra-premier-league-2025/matches/past-matches --html saved-listing.html --output candidates.jsonl

Omit --html for a direct public-page request. The output is a discovery queue. Verify
competition, season, teams, date, and result before promoting rows to --fixtures.
Verified innings can enter through --scorecards using the normalized JSONL schema above.

For an authorized scorecard already converted to the documented normalized JSONL
schema, use the same extractor in scorecard mode:

    python scripts/extract-cricheroes.py --scorecards normalized.jsonl --baseline DOMESTIC_SCORECARD_DB --fixtures scripts/domestic-scouting-fixtures.jsonl --output RELEASE_DIRECTORY

Each scorecard must include expected_innings, the number of innings confirmed in
the source. The command reconciles the innings, calls the existing domestic
importer, and writes the six CricHeroes CSVs. Supply --identity-map to resolve
provider IDs with verified evidence. This workflow writes staging exports.

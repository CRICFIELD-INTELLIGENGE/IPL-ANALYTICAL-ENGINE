"""Attach reviewed domestic discovery exports to a new Scout Lab SQLite snapshot."""
import argparse
import csv
from pathlib import Path
import sqlite3

TABLES = {
    "scout_domestic_fixture_index": "missing_20_matches.csv",
    "scout_domestic_fixture_sources": "missing_20_match_sources.csv",
    "scout_domestic_coverage": "missing_20_season_coverage.csv",
    "scout_domestic_identity_queue": "missing_20_unresolved_players.csv",
    "scout_domestic_player_innings": "missing_20_player_innings.csv",
    "scout_domestic_player_match_stats": "missing_20_player_match_stats.csv",
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("baseline", type=Path)
    parser.add_argument("exports", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    with args.output.open("xb"):
        pass
    try:
        with sqlite3.connect(args.baseline.resolve().as_uri()+"?mode=ro", uri=True) as source, sqlite3.connect(args.output) as stage:
            source.backup(stage)
            with stage:
                for table, filename in TABLES.items():
                    with (args.exports / filename).open(encoding="utf-8-sig", newline="") as f:
                        rows = csv.reader(f)
                        columns = next(rows)
                        if any(not col.isidentifier() for col in columns):
                            raise ValueError(f"Invalid export columns: {filename}")
                        stage.execute(f"CREATE TABLE {table} (" + ",".join(f'"{col}" TEXT' for col in columns) + ")")
                        stage.executemany(f"INSERT INTO {table} VALUES (" + ",".join("?" for _ in columns) + ")", rows)
                stage.execute("CREATE UNIQUE INDEX scout_domestic_fixture_key ON scout_domestic_fixture_index(canonical_match_id)")
                stage.execute("CREATE UNIQUE INDEX scout_domestic_provider_key ON scout_domestic_fixture_sources(provider, source_match_id)")
                for table in ("scout_domestic_player_innings", "scout_domestic_player_match_stats"):
                    stage.execute(f"CREATE INDEX {table}_match ON {table}(canonical_match_id)")
                    orphan = stage.execute(f"""
                        SELECT 1 FROM {table} AS stats
                        LEFT JOIN scout_domestic_fixture_index AS fixture USING (canonical_match_id)
                        WHERE fixture.canonical_match_id IS NULL LIMIT 1
                    """).fetchone()
                    if orphan:
                        raise ValueError(f"Missing fixture for {table}")
                assert stage.execute("PRAGMA integrity_check").fetchone() == ("ok",)
                assert not stage.execute("PRAGMA foreign_key_check").fetchall()
                for table in TABLES:
                    print(table, stage.execute(f"SELECT count(*) FROM {table}").fetchone()[0])
    except Exception:
        args.output.unlink(missing_ok=True)
        raise


if __name__ == "__main__":
    main()

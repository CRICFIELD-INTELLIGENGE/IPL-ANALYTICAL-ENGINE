"""Extract public CricHeroes scorecard links from tournament listings and saved pages."""
import argparse
import csv
import importlib.util
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlsplit
from urllib.request import HTTPRedirectHandler, build_opener


MATCH = re.compile(r"^/scorecard/(\d+)/([^/]+)/")
TOURNAMENT = re.compile(r"^/tournament/(\d+)/([^/]+)(?:/|$)")


def public_url(url):
    p = urlsplit(url)
    return (p.scheme == "https" and p.netloc.lower() in {"cricheroes.com", "www.cricheroes.com"})


class CricHeroesRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not public_url(newurl):
            raise ValueError("Unexpected redirect outside CricHeroes")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


class ScorecardLinks(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.source = source
        self.matches = {}
        tournament = TOURNAMENT.match(urlsplit(source).path)
        self.slug = tournament[2] if tournament else None

    def handle_starttag(self, tag, attrs):
        if tag != "a":
            return
        href = dict(attrs).get("href")
        if not href:
            return
        url = urljoin(self.source, href)
        if not public_url(url):
            return
        path = urlsplit(url).path
        match = MATCH.match(path)
        if not match or (self.slug and match[2] != self.slug):
            return
        self.matches.setdefault(match[1], {
            "provider": "CricHeroes",
            "source_match_id": match[1],
            "source_url": urlsplit(url)._replace(query="", fragment="").geturl(),
            "listing_url": self.source,
            "tournament_slug": match[2],
            "status": "needs_fixture_verification",
        })


def ingest_local(args):
    # Reuse the documented domestic JSONL schema and its reconciliation checks.
    spec = importlib.util.spec_from_file_location("domestic_scouting", Path(__file__).with_name("build-domestic-scouting.py"))
    importer = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(importer)
    import subprocess
    import sys
    import tempfile

    args.output.mkdir(parents=True, exist_ok=True)
    audit = []
    scorecards = []
    seen = {}
    conflicted = set()
    for path in args.scorecards:
        with path.open(encoding="utf-8-sig") as f:
            for line_number, line in enumerate(f, 1):
                if not line.strip():
                    continue
                mid = ""
                try:
                    raw = json.loads(line)
                    if not isinstance(raw, dict) or raw.get("provider") != "CricHeroes":
                        raise ValueError("Expected a CricHeroes scorecard object")
                    mid = str(raw.get("source_match_id", ""))
                    record = importer.match_record(raw)
                    if record.get("deliveries"):
                        raise ValueError("Expected innings aggregates")
                    innings = importer.validated_innings(record)
                    if not innings or record["status"] not in importer.FINISHED:
                        audit.append((path.name, line_number, mid, "INCOMPLETE", "No reconciled completed scorecard"))
                        continue
                    expected = raw.get("expected_innings")
                    if type(expected) is not int or expected != len(innings):
                        audit.append((path.name, line_number, mid, "INCOMPLETE", "Expected innings missing or inconsistent"))
                        continue
                    if mid in seen:
                        if seen[mid] != record:
                            conflicted.add(mid)
                            raise ValueError("Conflicting scorecards for the same source ID")
                        audit.append((path.name, line_number, mid, "DUPLICATE", "Identical source match"))
                        continue
                    seen[mid] = record
                    scorecards.append((record, path.name, line_number))
                except (ValueError, TypeError, AttributeError, KeyError) as exc:
                    audit.append((path.name, line_number, mid, "REJECTED", str(exc)))
    accepted = []
    for row, name, line in scorecards:
        mid = row["source_match_id"]
        if mid in conflicted:
            audit.append((name, line, mid, "REJECTED", "Conflicting source ID quarantined"))
        else:
            accepted.append(row)
            audit.append((name, line, mid, "RECONCILED", "Innings totals validated; see match index for final status"))
    with (args.output / "cricheroes_import_audit.csv").open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(("file", "line", "source_match_id", "status", "detail"))
        writer.writerows(audit)

    with tempfile.TemporaryDirectory() as tmp:
        feed = Path(tmp) / "cricheroes.jsonl"
        feed.write_text("".join(json.dumps(r) + "\n" for r in accepted), encoding="utf-8")
        cmd = [sys.executable, str(Path(__file__).with_name("build-domestic-scouting.py")),
               "--baseline", str(args.baseline), "--output", str(args.output), "--scorecards", str(feed)]
        if args.fixtures:
            cmd.extend(("--fixtures", str(args.fixtures)))
        if args.identity_map:
            cmd.extend(("--identity-map", str(args.identity_map)))
        subprocess.run(cmd, check=True)

    def read(name):
        with (args.output / name).open(encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            return reader.fieldnames, list(reader)

    def write(name, fields, rows):
        importer.write_csv(args.output / name, fields, rows)

    fields, index = read("missing_20_match_sources.csv")
    matches = [row for row in index if row["provider"] == "CricHeroes"]
    write("cricheroes_match_index.csv", fields, matches)
    verified_ids = {row["canonical_match_id"] for row in matches if row["verified"] == "True"}
    for source, target, predicate in (
        ("missing_20_player_innings.csv", "cricheroes_player_innings.csv",
         lambda row: row["provider"] == "CricHeroes"),
        ("missing_20_player_match_stats.csv", "cricheroes_player_match_stats.csv",
         lambda row: row["canonical_match_id"] in verified_ids and urlsplit(row["source_url"]).hostname in
         {"cricheroes.com", "www.cricheroes.com"}),
        ("missing_20_unresolved_players.csv", "cricheroes_unresolved_identities.csv",
         lambda row: row["provider"] == "CricHeroes"),
    ):
        fields, rows = read(source)
        write(target, fields, (row for row in rows if predicate(row)))
    fields, coverage = read("missing_20_season_coverage.csv")
    # Count provider coverage separately from the combined warehouse totals.
    from collections import Counter
    dates = {r["source_match_id"]: (r["competition_code"], r["start_date"][:4]) for r in accepted}
    reconciled = Counter(dates[r["source_match_id"]] for r in matches
                         if r["verified"] == "True" and r["source_match_id"] in dates)
    for row in coverage:
        row["cricheroes_reconciled_scorecards"] = reconciled[row["competition_code"], row["calendar_year"]]
    write("cricheroes_coverage_report.csv", fields + ["cricheroes_reconciled_scorecards"], coverage)


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument("--url", help="Public CricHeroes tournament or scorecard URL")
    cli.add_argument("--html", type=Path, help="Saved HTML from the same public page")
    cli.add_argument("--output", type=Path, required=True)
    cli.add_argument("--scorecards", nargs="+", type=Path, help="Authorized, normalized CricField JSONL")
    cli.add_argument("--baseline", type=Path)
    cli.add_argument("--fixtures", type=Path)
    cli.add_argument("--identity-map", type=Path)
    args = cli.parse_args()
    if args.scorecards:
        if args.url or args.html or not args.baseline:
            cli.error("--scorecards requires --baseline and is separate from --url/--html")
        ingest_local(args)
        return
    if not args.url:
        cli.error("Specify --url or --scorecards")
    if not public_url(args.url):
        cli.error("Use an HTTPS CricHeroes URL")
    links = ScorecardLinks(args.url)
    try:
        if args.html:
            markup = args.html.read_text(encoding="utf-8-sig")
        else:
            with build_opener(CricHeroesRedirect()).open(args.url, timeout=15) as response:
                if not public_url(response.geturl()):
                    raise ValueError("Unexpected redirect outside CricHeroes")
                data = response.read(8_000_001)
                if len(data) > 8_000_000:
                    raise ValueError("Page exceeds size limit")
                markup = data.decode(response.headers.get_content_charset() or "utf-8")
        links.feed(markup)
    except (OSError, ValueError) as exc:
        cli.exit(2, f"CricHeroes page unavailable: {exc}\n")
    if not links.matches:
        cli.exit(2, "No scorecard links in the supplied HTML. Try saving the rendered fixture listing.\n")
    args.output.write_text("".join(json.dumps(row) + "\n" for row in links.matches.values()), encoding="utf-8")
    print(f"Extracted {len(links.matches)} distinct scorecard links.")


if __name__ == "__main__":
    main()

"""Build one audited Scout Lab domestic release from a local baseline and authorized inputs."""
import argparse
from collections import Counter, defaultdict
import csv
from datetime import date
import hashlib
import json
from pathlib import Path
import re
import sqlite3
from urllib.parse import urlparse
import zipfile

START, END = date(2024, 1, 1), date(2026, 11, 13)
BCCI = {
    2024: "https://documents.bcci.tv/bcci/documents/1716367826850_BCCI%202024-25%20Season%20Schedule%20Team%20Groupings%20Knockout%20Qualifications%20200524.pdf",
    2025: "https://documents.bcci.tv/bcci/documents/1750423713884_BCCI-2025-26-Domestic-Season.pdf",
    2026: "https://documents.bcci.tv/bcci/documents/1779273276961_BCCI%202026-27%20Domestic%20Season%20Ready%20Reckoner.pdf",
}
GROUPS = {
    "state_t20": [
        ("apl", "Andhra Premier League"), ("bengal", "Bengal Pro T20 League"),
        ("dpl", "Delhi Premier League"), ("kcl", "Kerala Cricket League"),
        ("mpl", "Madhya Pradesh League"), ("rpl", "Rajasthan Premier League"),
        ("spl", "Saurashtra Premier League"), ("sher", "Sher-E-Punjab T20 Cup"),
        ("t20mumbai", "T20 Mumbai League"), ("upt20", "Uttar Pradesh T20 League"),
    ],
    "senior_domestic": [("duleep", "Duleep Trophy"), ("irani", "Irani Cup"), ("deodhar", "Deodhar Trophy")],
    "age_group": [("u23_state_t20", "Men's U23 State A T20"), ("ck_nayudu", "Col. C. K. Nayudu Trophy"),
                  ("cooch", "Cooch Behar Trophy"), ("vinoo", "Vinoo Mankad Trophy")],
    "pathway": [("india_a", "India A"), ("india_emerging", "India Emerging Teams"),
                ("india_u19", "India U19 internationals")],
}
REGISTRY = {code: (name, group) for group, items in GROUPS.items() for code, name in items}
REGISTRY.update({
    "smat": ("Syed Mushtaq Ali Trophy", "senior_domestic"),
    "vht": ("Vijay Hazare Trophy", "senior_domestic"),
    "ranji": ("Ranji Trophy", "senior_domestic"),
    "tnpl": ("Tamil Nadu Premier League", "state_t20"),
    "maharaja": ("Maharaja Trophy KSCA T20", "state_t20"),
})
FINISHED = {"win", "tie", "draw", "completed"}
STATUSES = FINISHED | {"abandoned", "no_result", "scheduled", "unknown"}
DOMAINS = {
    "Cricbuzz": "cricbuzz.com", "ESPNcricinfo": "espncricinfo.com", "Cricsheet": "cricsheet.org", "CricHeroes": "cricheroes.com",
}
DOMAINS.update({"IPL.com": "ipl.com", "Sporting News": "sportingnews.com", "CREX": "crex.com"})
SCORECARD_ID = re.compile(r"/(?:live-cricket-scorecard|live-cricket-scores|cricket-match-facts)/(\d+)(?:/|$)")
CREDIT = {"bowled", "caught", "caught and bowled", "lbw", "stumped", "hit wicket"}


def source_url(value, provider=None):
    url = urlparse(value)
    if url.scheme != "https" or not url.hostname or url.username or url.password:
        raise ValueError(f"Expected public HTTPS evidence URL: {value}")
    domain = DOMAINS.get(provider)
    if domain and url.hostname != domain and not url.hostname.endswith("." + domain):
        raise ValueError(f"Wrong source domain for {provider}: {value}")
    return value


def scoped_date(value):
    day = date.fromisoformat(value)
    if not START <= day <= END:
        raise ValueError(f"Date outside release window: {value}")
    return day


def balls(overs, per_over=6):
    whole, _, partial = str(overs).partition(".")
    if not whole.isdigit() or (partial and not partial.isdigit()):
        raise ValueError(f"Invalid overs: {overs}")
    partial = int(partial or 0)
    if partial >= per_over:
        raise ValueError(f"Invalid balls in partial over: {overs}")
    return int(whole) * per_over + partial


def number(value):
    if type(value) is not int or value < 0:
        raise ValueError(f"Expected nonnegative integer: {value}")
    return value


def read_jsonl(paths):
    for path in paths:
        with path.open(encoding="utf-8-sig") as f:
            for line_number, line in enumerate(f, 1):
                if line.strip():
                    try:
                        yield json.loads(line)
                    except ValueError as exc:
                        raise ValueError(f"{path}:{line_number}: {exc}") from exc


def write_csv(path, fields, rows):
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def csv_rows(path):
    if path:
        with path.open(encoding="utf-8-sig", newline="") as f:
            yield from csv.DictReader(f)


def canonical_id(code, fmt, day, teams, fixture_key):
    # A verified fixture key distinguishes same-day repeat meetings.
    value = json.dumps([code, fmt, day, sorted(t.casefold() for t in teams), fixture_key],
                       ensure_ascii=False, separators=(",", ":"))
    return "dom_" + hashlib.sha256(value.encode()).hexdigest()[:24]


def match_record(row):
    provider = row["provider"]
    if provider not in (*DOMAINS, "Official"):
        raise ValueError(f"Unsupported provider: {provider}")
    m = dict(row)
    m["source_match_id"] = str(m["source_match_id"]).strip()
    if not m["source_match_id"] or m["competition_code"] not in REGISTRY:
        raise ValueError("Match must have a source ID and a registered competition")
    start, end = scoped_date(m["start_date"]), scoped_date(m.get("end_date") or m["start_date"])
    m["end_date"] = end.isoformat()
    if end < start or m["status"] not in STATUSES or m["team1"].casefold() == m["team2"].casefold():
        raise ValueError("Invalid match date, status, or teams")
    source_url(m["source_url"], provider)
    if provider == "Cricbuzz":
        url_id = SCORECARD_ID.search(urlparse(m["source_url"]).path)
        if not url_id or url_id[1] != m["source_match_id"]:
            raise ValueError("Cricbuzz match ID disagrees with source URL")
    if provider == "CricHeroes":
        url_id = re.match(r"/scorecard/(\d+)(?:/|$)", urlparse(m["source_url"]).path)
        if not url_id or url_id[1] != m["source_match_id"]:
            raise ValueError("CricHeroes match ID disagrees with source URL")
    if m.get("winner") and m["winner"] not in (m["team1"], m["team2"]):
        raise ValueError("Winner must be a participating team")
    if not m["season"] or not m["format"]:
        raise ValueError("Season and format are required")
    m["canonical_match_id"] = canonical_id(m["competition_code"], m["format"], m["start_date"],
        (m["team1"], m["team2"]), m.get("verified_fixture_key") or f'{provider}:{m["source_match_id"]}')
    return m


def validated_innings(match):
    teams = {match["team1"], match["team2"]}
    result = []
    for idx, raw in enumerate(match.get("innings", []), 1):
        inning = dict(raw)
        if inning["batting_team"] not in teams or inning["bowling_team"] != next(
            t for t in teams if t != inning["batting_team"]
        ):
            raise ValueError("Invalid innings teams")
        for key in ("runs", "wickets", "extras", "legal_balls"):
            number(inning[key])
        batting, bowling = inning.get("batting", []), inning.get("bowling", [])
        for line, metrics in [(line, ("runs", "balls", "fours", "sixes", "dismissed")) for line in batting] + [
            (line, ("legal_balls", "maidens", "runs", "wickets")) for line in bowling
        ]:
            if not line["name"].strip():
                raise ValueError("Missing player name")
            for key in metrics:
                number(line[key])
        if any(line["dismissed"] not in (0, 1) or line["runs"] < line["fours"] * 4 + line["sixes"] * 6
               for line in batting):
            raise ValueError("Invalid batting line")
        if (sum(x["runs"] for x in batting) + inning["extras"] != inning["runs"]
            or sum(x["dismissed"] for x in batting) != inning["wickets"]
            or sum(x["legal_balls"] for x in bowling) != inning["legal_balls"]
            or sum(x["wickets"] for x in bowling) > inning["wickets"]):
            raise ValueError(f"Innings {idx} failed reconciliation")
        result.append(inning)
    return result


def baseline_scorecards(db):
    for m in db.execute("SELECT * FROM domestic_match"):
        row = dict(m)
        if row["competition_code"] not in REGISTRY:
            continue
        row["status"] = row["result"]
        row["innings"] = []
        params = (row["provider"], row["source_match_id"])
        for i in db.execute("SELECT * FROM domestic_innings WHERE provider=? AND source_match_id=? ORDER BY innings", params):
            args = (*params, i["innings"])
            row["innings"].append(dict(
                batting_team=i["batting_team"], bowling_team=i["bowling_team"], runs=i["total"],
                wickets=i["wickets"], extras=i["extras"], legal_balls=i["legal_balls"],
                batting=[dict(x) for x in db.execute("""
                    SELECT displayed_name name, dismissed, runs, balls, fours, sixes
                    FROM domestic_batting WHERE provider=? AND source_match_id=? AND innings=? ORDER BY position
                """, args)],
                bowling=[dict(x) for x in db.execute("""
                    SELECT displayed_name name, legal_balls, maidens, runs_conceded runs, wickets
                    FROM domestic_bowling WHERE provider=? AND source_match_id=? AND innings=? ORDER BY bowling_order
                """, args)],
            ))
        yield row


def cricsheet_records(archive, mapped):
    """Read official downloaded JSON archives; a verified manifest assigns each match."""
    with zipfile.ZipFile(archive) as z:
        for entry in z.infolist():
            mid = Path(entry.filename).stem
            if not entry.filename.endswith(".json") or mid not in mapped:
                continue
            doc = json.loads(z.read(entry))
            info = doc["info"]
            row = dict(mapped[mid])
            if info["gender"] != "male" or sorted(info["teams"]) != sorted([row["team1"], row["team2"]]):
                raise ValueError(f"Cricsheet match metadata conflicts with fixture: {mid}")
            if min(info["dates"]) != row["start_date"] or max(info["dates"]) != (row.get("end_date") or row["start_date"]):
                raise ValueError(f"Cricsheet date mismatch: {mid}")
            if str(info["season"]).replace("-", "/") != row["season"].replace("-", "/"):
                raise ValueError(f"Cricsheet season mismatch: {mid}")
            row["venue"] = info.get("venue")
            row["toss"] = info.get("toss")
            row["innings"] = []
            row["balls_per_over"] = info["balls_per_over"]
            row["deliveries"] = []
            ids = info["registry"]["people"]
            for inn in doc.get("innings", []):
                if inn.get("super_over"):
                    continue
                bat, bowl, extras = {}, {}, 0
                if inn.get("penalty_runs") or inn.get("miscounted_overs"):
                    raise ValueError(f"Manual scorecard required for penalty-run or miscounted-over innings: {mid}")
                for over in inn["overs"]:
                    per_over = Counter()
                    for seq, d in enumerate(over["deliveries"], 1):
                        row["deliveries"].append(dict(innings=len(row["innings"])+1, over=over["over"], sequence=seq, delivery=d))
                        ex = d.get("extras", {})
                        legal = int(not (ex.get("wides") or ex.get("noballs")))
                        r = d["runs"]["batter"]
                        for name in (d["batter"], d["non_striker"]):
                            bat.setdefault(name, dict(name=name, source_player_id=ids[name], dismissed=0,
                                                     runs=0, balls=0, fours=0, sixes=0))
                        b = bat[d["batter"]]
                        b["runs"] += r
                        b["balls"] += int(not ex.get("wides"))
                        b["fours"] += int(r == 4 and not d["runs"].get("non_boundary"))
                        b["sixes"] += int(r == 6 and not d["runs"].get("non_boundary"))
                        name = d["bowler"]
                        q = bowl.setdefault(name, dict(name=name, source_player_id=ids[name], legal_balls=0,
                                                      maidens=0, runs=0, wickets=0, wides=0, no_balls=0))
                        q["legal_balls"] += legal
                        conceded = r + ex.get("wides", 0) + ex.get("noballs", 0)
                        q["runs"] += conceded
                        q["wides"] += ex.get("wides", 0)
                        q["no_balls"] += ex.get("noballs", 0)
                        per_over[name, "balls"] += legal
                        per_over[name, "runs"] += conceded
                        extras += d["runs"]["extras"]
                        for w in d.get("wickets", []):
                            player, kind = w["player_out"], w["kind"]
                            b = bat.setdefault(player, dict(name=player, source_player_id=ids[player],
                                runs=0, balls=0, fours=0, sixes=0, dismissed=0))
                            b["dismissed"] = int(kind not in ("retired hurt", "retired not out"))
                            b["dismissal_type"] = kind
                            q["wickets"] += int(kind in CREDIT)
                    for name in {x[0] for x in per_over}:
                        if per_over[name, "balls"] == info["balls_per_over"] and not per_over[name, "runs"]:
                            bowl[name]["maidens"] += 1
                if not bat and not bowl:
                    continue
                t = inn["team"]
                row["innings"].append(dict(batting_team=t, bowling_team=next(x for x in info["teams"] if x != t),
                    runs=sum(x["runs"] for x in bat.values())+extras, wickets=sum(x["dismissed"] for x in bat.values()),
                    extras=extras, legal_balls=sum(x["legal_balls"] for x in bowl.values()),
                    batting=list(bat.values()), bowling=list(bowl.values()), target=inn.get("target")))
            yield row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", type=Path, required=True, help="Existing domestic-v3 SQLite snapshot")
    parser.add_argument("--output", type=Path, required=True, help="New release directory")
    parser.add_argument("--fixtures", type=Path, nargs="*", default=[], help="Verified local JSONL fixture manifests")
    parser.add_argument("--scorecards", type=Path, nargs="*", default=[], help="Authorized Cricbuzz, Cricinfo, CricHeroes or official JSONL")
    parser.add_argument("--cricsheet", type=Path, nargs="*", default=[], help="Official local Cricsheet JSON ZIPs")
    parser.add_argument("--identity-map", type=Path, help="Verified provider player ID to CricField ID CSV")
    parser.add_argument("--edition-evidence", type=Path, help="CSV of verified edition statuses and expected completed counts")
    args = parser.parse_args()
    out = args.output
    out.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(args.baseline.resolve().as_uri()+"?mode=ro", uri=True) as db:
        db.row_factory = sqlite3.Row
        player_fields = [x[1] for x in db.execute("PRAGMA table_info(player_match_master)")]
        players = {x["cricfield_player_id"]: dict(x) for x in db.execute("SELECT * FROM players")}
        register = {p["cricsheet_id"]: k for k, p in players.items() if p["cricsheet_id"]}
        existing = [dict(x) for x in db.execute("SELECT * FROM player_match_master")]
        baseline = list(baseline_scorecards(db))
    verified = {("Cricsheet", k): v for k, v in register.items()}
    for row in csv_rows(args.identity_map):
        key = (row["provider"], row["source_player_id"])
        source_url(row["evidence_url"])
        pid = int(row["cricfield_player_id"])
        if not key[1] or pid not in players or verified.setdefault(key, pid) != pid:
            raise ValueError(f"Conflicting or invalid identity mapping: {key}")
    records, issues = {}, []
    fixtures = list(read_jsonl(args.fixtures))
    archive_map = {str(x["source_match_id"]): x for x in fixtures if x["provider"] == "Cricsheet"}
    sources = [*fixtures, *baseline, *read_jsonl(args.scorecards)]
    for archive in args.cricsheet:
        try:
            sources.extend(cricsheet_records(archive, archive_map))
        except (KeyError, ValueError, zipfile.BadZipFile) as exc:
            issues.append((archive.name, str(exc)))
    for raw in sources:
        key = (raw.get("provider"), str(raw.get("source_match_id")))
        try:
            m = match_record(raw)
            if m["provider"] != "Cricsheet" and m.get("deliveries"):
                raise ValueError("Delivery rows are supported only through the licensed Cricsheet adapter")
            old = records.get(key)
            if old and any(m[k] != old[k] for k in ("competition_code", "format", "season", "start_date", "team1", "team2")):
                raise ValueError("Conflicting match metadata for same provider ID")
            if old and old.get("verified_fixture_key") and not m.get("verified_fixture_key"):
                m["verified_fixture_key"] = old["verified_fixture_key"]
                m = match_record(m)
            inn = validated_innings(m)
            m["parsed"] = bool(inn)
            m["verified"] = bool(inn and m["status"] in FINISHED)
            m["innings"] = inn
            if not old or m["verified"] or not old["verified"]:
                records[key] = m
        except (KeyError, TypeError, ValueError) as exc:
            issues.append((":".join(map(str, key)), str(exc)))
    by_match = defaultdict(list)
    for m in records.values():
        by_match[m["canonical_match_id"]].append(m)
    # Records without an explicit cross-provider key can be counted separately only
    # when there is no competing source for the same match metadata.
    potential_duplicates = defaultdict(list)
    for m in records.values():
        key = (m["competition_code"], m["format"], m["start_date"],
               tuple(sorted((m["team1"].casefold(), m["team2"].casefold()))))
        potential_duplicates[key].append(m)
    for candidates in potential_duplicates.values():
        if (len({m["provider"] for m in candidates}) > 1
                and len({m["canonical_match_id"] for m in candidates}) > 1
                and not all(m.get("verified_fixture_key") for m in candidates)):
            for m in candidates:
                m["verified"] = False
            issues.append((candidates[0]["canonical_match_id"], "Possible cross-provider duplicate needs fixture evidence"))
    entries = []
    for mid, candidates in sorted(by_match.items()):
        candidates.sort(key=lambda m: (m["verified"], len(m.get("deliveries", []))), reverse=True)
        best = candidates[0]
        signatures = {tuple((i["batting_team"], i["runs"], i["wickets"], i["legal_balls"]) for i in m["innings"])
                      for m in candidates if m["verified"]}
        if len(signatures)>1:
            best["verified"] = False
            issues.append((mid, "Scorecard providers disagree on innings totals"))
        entries.append(best)
    editions = {}
    for r in csv_rows(args.edition_evidence):
        code, year = r["competition_code"], int(r["calendar_year"])
        source_url(r["evidence_url"])
        if code not in REGISTRY or year not in range(2024, 2027) or (code, year) in editions:
            raise ValueError("Invalid or duplicate edition evidence")
        editions[code, year] = r
    match_cols = ["canonical_match_id", "competition_code", "season", "format", "start_date", "end_date", "team1",
                  "team2", "venue", "status", "winner", "provider", "source_match_id", "source_url", "verified"]
    innings_cols = ["canonical_match_id", "provider", "source_match_id", "innings", "team", "discipline", "order",
                    "name", "source_player_id", "cricfield_player_id", "runs", "balls", "fours", "sixes", "dismissed",
                    "dismissal_type", "legal_balls", "maidens", "wickets", "wides", "no_balls", "source_url"]
    inning_rows, unresolved, summaries, new = [], [], [], []
    baseline_ids = {str(r["match_id"]) for r in existing}
    for m in entries:
        if not m["verified"]:
            continue
        players_in_match = defaultdict(list)
        for ix, inn in enumerate(m["innings"], 1):
            for discipline in ("batting", "bowling"):
                team = inn["batting_team" if discipline == "batting" else "bowling_team"]
                for order, line in enumerate(inn[discipline], 1):
                    row = {k: m.get(k) for k in ("canonical_match_id", "provider", "source_match_id", "source_url")}
                    row.update({k: line.get(k) for k in innings_cols if k in line})
                    sid = str(line.get("source_player_id") or "")
                    pid = verified.get((m["provider"], sid))
                    row.update(innings=ix, team=team, discipline=discipline, order=order, cricfield_player_id=pid)
                    inning_rows.append(row)
                    key = (team, str(pid) if pid else sid or line["name"])
                    players_in_match[key].append(row)
                    if pid is None:
                        unresolved.append({k: row.get(k) for k in
                           ("provider", "source_match_id", "team", "name", "source_player_id", "source_url")})
        for (team, _), lines in players_in_match.items():
            pid = lines[0]["cricfield_player_id"]
            batting = [r for r in lines if r["discipline"]=="batting"]
            bowling = [r for r in lines if r["discipline"]=="bowling"]
            def total(rs, k):
                vals = [r[k] for r in rs if r.get(k) is not None]
                return sum(vals) if vals else None
            s = dict(canonical_match_id=m["canonical_match_id"], competition_code=m["competition_code"],
                season=m["season"], match_date=m["start_date"], format=m["format"], team=team,
                name=lines[0]["name"], cricfield_player_id=pid, source_url=m["source_url"],
                runs=total(batting,"runs"), balls=total(batting,"balls"), fours=total(batting,"fours"),
                sixes=total(batting,"sixes"), dismissals=total(batting,"dismissed"), legal_balls=total(bowling,"legal_balls"),
                runs_conceded=total(bowling,"runs"), wickets=total(bowling,"wickets"), maidens=total(bowling,"maidens"))
            summaries.append(s)
            if pid is None or (m["provider"]=="Cricsheet" and m["source_match_id"] in baseline_ids):
                continue
            p=players[pid]
            new.append(dict(cricfield_player_id=pid, player_name=p["unique_name"] or p["name"], cricsheet_id=p["cricsheet_id"],
              competition_id=m["competition_code"], competition_name=REGISTRY[m["competition_code"]][0],
              competition_type=REGISTRY[m["competition_code"]][1], competition_format=m["format"], season=m["season"],
              match_id=m["canonical_match_id"], match_date=m["start_date"], match_end_date=m["end_date"], venue=m.get("venue"),
              team_name=team, opposition_team=m["team2"] if team==m["team1"] else m["team1"],
              match_result=("win" if team==m["winner"] else "loss") if m.get("winner") else m["status"],
              observed_on_field=1, runs_scored=s["runs"], balls_faced=s["balls"], fours=s["fours"], sixes=s["sixes"],
              dismissals=s["dismissals"], legal_balls_bowled=s["legal_balls"], runs_conceded=s["runs_conceded"],
              wickets_taken=s["wickets"], maidens=s["maidens"], source_provider=m["provider"],
              source_match_id=m["source_match_id"], source_url=m["source_url"], source_format="scorecard",
              data_completeness="partial_fields", verification_status="verified_source_player_id"))
    if len({(x["match_id"],x["cricfield_player_id"]) for x in new}) != len(new):
        raise ValueError("Duplicate canonical player-match records")
    coverage = []
    for code,(name,group) in REGISTRY.items():
        for y in range(2024,2027):
            matches = [m for m in entries if m["competition_code"]==code and m["start_date"].startswith(str(y))]
            proof = editions.get((code,y), {})
            expected = int(proof["expected_completed_matches"]) if proof.get("expected_completed_matches") else None
            if expected is not None and expected < 0:
                raise ValueError("Expected completed matches cannot be negative")
            count = sum(m["verified"] for m in matches)
            if proof.get("edition_status")=="NOT HELD" and matches:
                raise ValueError(f"NOT HELD conflicts with records: {code} {y}")
            # Require an exhaustive completed-fixture manifest, not simply an equal row count.
            exact = all(m.get("verified_fixture_key") for m in matches if m["status"] in FINISHED)
            complete = expected is not None and expected>0 and expected==count and exact and proof.get("fixture_list_verified")=="1"
            status = ("COMPLETE" if complete else "NOT HELD" if proof.get("edition_status")=="NOT HELD" else
                      "PARTIAL" if count else "NEEDS VERIFICATION" if matches or proof else "SOURCE UNAVAILABLE")
            source = proof.get("evidence_url") or next((m["source_url"] for m in matches), "")
            if not source and group in ("senior_domestic","age_group"):
                source = BCCI[y]
            coverage.append(dict(competition_code=code,competition_name=name,calendar_year=y,
              seasons_observed=";".join(sorted({m["season"] for m in matches})), status=status,
              expected_completed_matches=expected, discovered_matches=len(matches),
              parsed_scorecards=sum(m["parsed"] for m in matches),verified_matches=count,
              verified_player_ids=len({r["cricfield_player_id"] for r in summaries if r["competition_code"]==code
                and r["match_date"].startswith(str(y)) and r["cricfield_player_id"] is not None}),
              delivery_matches=sum(bool(m.get("deliveries")) for m in matches if m["verified"]),
              missing_completed_matches=max(0,expected-count) if expected is not None else None,
              evidence_url=source,access="Authorized local inputs only"))
    registry=[dict(competition_code=k,competition_name=v[0],group=v[1]) for k,v in REGISTRY.items()]
    write_csv(out/"missing_20_competitions_registry.csv",list(registry[0]),registry)
    write_csv(out/"missing_20_season_coverage.csv",list(coverage[0]),coverage)
    source_cols = ["canonical_match_id", "provider", "source_match_id", "source_url", "verified"]
    write_csv(out/"missing_20_match_sources.csv", source_cols,
              ({k: m.get(k) for k in source_cols} for m in records.values()))
    write_csv(out/"missing_20_matches.csv",match_cols,({k:m.get(k) for k in match_cols} for m in entries))
    with (out/"missing_20_deliveries.jsonl").open("w", encoding="utf-8") as f:
        for m in entries:
            if m["verified"]:
                for row in m.get("deliveries", []):
                    f.write(json.dumps(dict(canonical_match_id=m["canonical_match_id"], provider=m["provider"],
                                           source_url=m["source_url"], **row), ensure_ascii=False)+"\n")
    write_csv(out/"missing_20_player_innings.csv",innings_cols,inning_rows)
    summary_cols = ["canonical_match_id","competition_code","season","match_date","format","team","name","cricfield_player_id",
                    "source_url","runs","balls","fours","sixes","dismissals","legal_balls","runs_conceded","wickets","maidens"]
    write_csv(out/"missing_20_player_match_stats.csv",summary_cols,summaries)
    unresolved_cols = ["provider","source_match_id","team","name","source_player_id","source_url"]
    unknown = {tuple(r[k] for k in unresolved_cols) for r in unresolved}
    write_csv(out/"missing_20_unresolved_players.csv",unresolved_cols,
              (dict(zip(unresolved_cols,r)) for r in sorted(unknown,key=str)))
    write_csv(out/"cricfield_scouting_master_2024_2026.csv",player_fields,(
        {k:r.get(k) for k in player_fields} for r in existing+new))
    counts=Counter(r["status"] for r in coverage)
    report = ["# Scout Lab domestic validation", "",
              f"- Registry: {len(registry)} categories across {len(coverage)} calendar-year coverage rows.",
              f"- Source records: {len(records)}. Verified fixtures: {sum(m['verified'] for m in entries)}.",
              f"- Player innings: {len(inning_rows)}. Player-match summaries: {len(summaries)}.",
              f"- Master: {len(existing)} original rows plus {len(new)} identity-verified additions.",
              f"- Unresolved source player occurrences: {len(unknown)}.", f"- Coverage: {dict(counts)}.",
              "- Blank expected counts are unknown. Calendar notices are discovery references, not evidence of completed fixtures.",
              "- No network scraping performed. Cricbuzz, ESPNcricinfo and official provider imports accept authorized local normalized data.",
              "- Verified fixture keys and provider player IDs must come from source evidence. Names are not used to join canonical players."]
    report += ["", "## Rejected inputs", ""]+[f"- {key}: {message}" for key,message in issues]
    (out/"missing_20_data_quality_report.md").write_text("\n".join(report)+"\n",encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()

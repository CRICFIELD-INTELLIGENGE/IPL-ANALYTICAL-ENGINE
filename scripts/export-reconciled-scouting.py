"""Export scouting data and attach read-only evidence tables to a staging warehouse."""
import argparse
from collections import Counter, defaultdict
import csv
from datetime import date, timedelta
import json
import re
from pathlib import Path
import sqlite3
from xml.sax.saxutils import escape
import zipfile

WINDOW_START = "2024-01-01"
AS_OF = date(2026, 11, 13)
FORMATS = ("T20", "List A", "First-class", "T20I", "ODI", "Test", "100-ball")


def csv_out(root, name, rows, columns):
    with (root / (name + ".csv")).open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def result(db, sql, args=()):
    cur = db.execute(sql, args)
    return [x[0] for x in cur.description], [dict(r) for r in cur]


def ratio(a, b, scale=1):
    return round(a * scale / b, 4) if a is not None and b else None


def sum_known(rows, key):
    values = [r[key] for r in rows if r.get(key) is not None]
    return sum(values) if values else None


def form_rows(master, innings_counts):
    groups = defaultdict(list)
    for row in master:
        if row["observed_on_field"] and row["competition_format"] in FORMATS:
            groups[row["cricfield_player_id"], row["competition_format"]].append(row)
    fields = ["runs_scored", "balls_faced", "fours", "sixes", "dot_balls", "dismissals",
              "legal_balls_bowled", "runs_conceded", "wickets_taken", "dot_balls_bowled"]
    for (pid, fmt), matches in sorted(groups.items()):
        matches.sort(key=lambda r: (r["match_end_date"], str(r["match_id"])), reverse=True)
        windows = {f"last_{n}_matches": matches[:n] for n in (5, 10, 20)}
        windows.update({f"last_{n}_days": [r for r in matches if r["match_end_date"] >=
                       (AS_OF - timedelta(days=n-1)).isoformat()] for n in (30, 90, 180, 365)})
        windows["full_period"] = matches
        for window, rows in windows.items():
            if not rows:
                continue
            counts = {k: sum_known(rows, k) for k in fields}
            r = dict(cricfield_player_id=pid, format=fmt, as_of=AS_OF.isoformat(), window=window,
                     matches=len(rows), batting_innings=sum(innings_counts.get((str(x["match_id"]),pid),0) for x in rows),
                     delivery_backed_matches=sum(x["source_format"] == "JSON" for x in rows), **counts)
            faced, legal = counts["balls_faced"], counts["legal_balls_bowled"]
            r.update(batting_average=ratio(counts["runs_scored"], counts["dismissals"]),
                     strike_rate=ratio(counts["runs_scored"], faced, 100),
                     boundary_pct=ratio((counts["fours"] or 0)+(counts["sixes"] or 0),faced,100),
                     batting_dot_pct=ratio(counts["dot_balls"],faced,100),
                     economy=ratio(counts["runs_conceded"],legal,5 if fmt=="100-ball" else 6),
                     bowling_average=ratio(counts["runs_conceded"],counts["wickets_taken"]),
                     bowling_strike_rate=ratio(legal,counts["wickets_taken"]),
                     bowling_dot_pct=ratio(counts["dot_balls_bowled"],legal,100))
            yield r


def workbook(root, names):
    # Simple OOXML writer. Source strings remain text, including leading '='.
    main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
    office = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    package = "http://schemas.openxmlformats.org/package/2006/relationships"
    ct = "http://schemas.openxmlformats.org/package/2006/content-types"
    with zipfile.ZipFile(root/"cricfield_scouting_master_2024_2026.xlsx","w",zipfile.ZIP_DEFLATED) as z:
        sheets, links, types = [], [], []
        for i,(title,filename) in enumerate(names,1):
            sheets.append(f'<sheet name="{title}" sheetId="{i}" r:id="rId{i}"/>')
            links.append(f'<Relationship Id="rId{i}" Type="{office}/worksheet" Target="worksheets/sheet{i}.xml"/>')
            types.append(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>')
            with (root/filename).open(encoding="utf-8-sig",newline="") as src, z.open(f"xl/worksheets/sheet{i}.xml","w") as dst:
                dst.write(f'<worksheet xmlns="{main}"><sheetData>'.encode())
                reader = csv.reader(src)
                headings = next(reader)
                text_fields = {"cricsheet_id", "source_match_id", "match_id", "season", "competition_id"}
                def cells(row, header=False):
                    for key, value in zip(headings, row):
                        if not header and key not in text_fields and re.fullmatch(r"-?(0|[1-9]\d*)(\.\d+)?",value):
                            yield f'<c><v>{value}</v></c>'
                        else:
                            yield f'<c t="inlineStr"><is><t xml:space="preserve">{escape(value)}</t></is></c>'
                dst.write(("<row>"+"".join(cells(headings,True))+"</row>").encode())
                for row in reader:
                    dst.write(("<row>"+"".join(cells(row))+"</row>").encode())
                dst.write(b"</sheetData></worksheet>")
        z.writestr("xl/workbook.xml",f'<workbook xmlns="{main}" xmlns:r="{office}"><sheets>{"".join(sheets)}</sheets></workbook>')
        z.writestr("xl/_rels/workbook.xml.rels",f'<Relationships xmlns="{package}">{"".join(links)}</Relationships>')
        z.writestr("_rels/.rels",f'<Relationships xmlns="{package}"><Relationship Id="rId1" Type="{office}/officeDocument" Target="xl/workbook.xml"/></Relationships>')
        z.writestr("[Content_Types].xml",f'<Types xmlns="{ct}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>{"".join(types)}</Types>')


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--stage",type=Path,required=True)
    p.add_argument("--domestic",type=Path,required=True,help="Existing local domestic scorecard SQLite snapshot")
    p.add_argument("--coverage",type=Path,required=True,help="Domestic 20-category coverage CSV")
    args=p.parse_args()
    root=args.stage.parent
    db=sqlite3.connect(args.stage.resolve().as_uri()+"?mode=rw",uri=True)
    db.row_factory=sqlite3.Row
    db.execute("ATTACH DATABASE ? AS evidence",(args.domestic.resolve().as_uri()+"?mode=ro",))
    if not db.execute("SELECT 1 FROM sqlite_master WHERE name='scout_merge_audit'").fetchone():
        raise ValueError("Expected a new reconciliation staging warehouse")
    with args.coverage.open(encoding="utf-8-sig",newline="") as f:
        domestic_coverage=list(csv.DictReader(f))
    player_ids={r["cricsheet_id"]:r["player_key"] for r in db.execute("SELECT player_key,cricsheet_id FROM players")}
    columns, master=result(db,"SELECT * FROM evidence.player_match_master WHERE match_date>=? AND match_end_date<=?",
                           (WINDOW_START,AS_OF.isoformat()))
    match_ids={str(r[0]) for r in db.execute("SELECT match_id FROM matches")}
    master=[r for r in master if str(r["match_id"]) in match_ids and r["cricsheet_id"] in player_ids]
    for row in master:
        row["cricfield_player_id"]=player_ids[row["cricsheet_id"]]
    keys={(str(r["match_id"]),r["cricfield_player_id"]) for r in master}
    if len(keys)!=len(master):
        raise ValueError("Duplicate canonical player-match rows")
    inning_counts={(str(mid),player_ids[cric]):n for mid,cric,n in db.execute("""
      SELECT i.match_id,p.cricsheet_id,count(*) FROM evidence.player_innings i
      JOIN evidence.players p USING(cricfield_player_id) WHERE i.runs_scored IS NOT NULL GROUP BY 1,2
    """) if cric in player_ids}
    forms=list(form_rows(master,inning_counts))
    with db:
        for table in ("scout_domestic_match","scout_domestic_innings","scout_domestic_batting",
                      "scout_domestic_bowling","scout_recent_form"):
            db.execute("DROP TABLE IF EXISTS "+table)
        for table in ("match","innings","batting","bowling"):
            db.execute(f"CREATE TABLE scout_domestic_{table} AS SELECT * FROM evidence.domestic_{table}")
            db.execute(f"CREATE INDEX scout_domestic_{table}_source ON scout_domestic_{table}(provider,source_match_id)")
        fields=list(forms[0])
        field_types={k:("TEXT" if k in ("format","as_of","window") else "INTEGER" if k in
                        ("cricfield_player_id","matches","batting_innings","delivery_backed_matches") else "REAL") for k in fields}
        db.execute("CREATE TABLE scout_recent_form ("+",".join(f'"{k}" {field_types[k]}' for k in fields)+
                   ', PRIMARY KEY(cricfield_player_id,format,"window"), FOREIGN KEY(cricfield_player_id) REFERENCES players(player_key))')
        db.executemany("INSERT INTO scout_recent_form VALUES ("+",".join("?" for _ in fields)+")",
                       (tuple(r[k] for k in fields) for r in forms))
    csv_out(root,"cricfield_scouting_master_2024_2026",master,columns)
    csv_out(root,"cricfield_player_match_stats",master,columns)
    csv_out(root,"cricfield_player_recent_form",forms,fields)
    for name,sql in {
        "players_verified":"SELECT player_key AS cricfield_player_id,cricsheet_id,name,unique_name,in_register FROM players WHERE cricsheet_id NOT LIKE 'unreg:%' ORDER BY player_key",
        "source_registry":"SELECT * FROM source_files",
        "merge_audit":"SELECT * FROM scout_merge_audit ORDER BY source_match_id",
        "auction_eligibility":"""SELECT p.player_key AS cricfield_player_id,p.cricsheet_id,a.last_ipl_team,a.last_ipl_season,
          a.current_contract_status,a.capped_or_uncapped_status,a.auction_registration_status,
          a.likely_auction_availability,a.source_url
          FROM evidence.auction_status a JOIN evidence.players e USING(cricfield_player_id)
          JOIN players p ON p.cricsheet_id=e.cricsheet_id""",
        "unresolved_identities":"""SELECT DISTINCT provider,source_match_id,displayed_name FROM scout_domestic_batting
          UNION SELECT DISTINCT provider,source_match_id,displayed_name FROM scout_domestic_bowling""",
        "data_quality_issues":"""SELECT 'identity_pending' AS issue,provider,source_match_id FROM scout_domestic_match
          UNION ALL SELECT action,'Cricsheet',CAST(source_match_id AS TEXT) FROM scout_merge_audit WHERE action='source_missing'""",
    }.items():
        keys_out, rows=result(db,sql)
        csv_out(root,"cricfield_"+name,rows,keys_out)
    coverage={}
    for r in domestic_coverage:
        coverage[r["competition_name"],r["calendar_year"]]=dict(competition=r["competition_name"],
            calendar_year=r["calendar_year"],expected_matches=r.get("expected_completed_matches"),indexed_fixtures=r.get("discovered_matches"),
            scorecard_matches=0,delivery_matches=0,reference=r.get("evidence_url"))
    for competition,year,n in db.execute("""SELECT c.name,substr(m.start_date,1,4),count(*)
        FROM matches m JOIN competitions c USING(competition_id) WHERE m.start_date>=? AND m.end_date<=?
        AND EXISTS(SELECT 1 FROM deliveries d WHERE d.match_id=m.match_id)
        AND (m.winner_id IS NOT NULL OR m.result IN ('tie','draw'))
        GROUP BY 1,2""",(WINDOW_START,AS_OF.isoformat())):
        row=coverage.setdefault((competition,year),dict(competition=competition,calendar_year=year,expected_matches=None,
            indexed_fixtures=None,scorecard_matches=0,delivery_matches=0,reference=None))
        row["delivery_matches"]=n
    for competition,year,n in db.execute("SELECT competition_name,substr(start_date,1,4),count(*) FROM scout_domestic_match GROUP BY 1,2"):
        row=coverage.setdefault((competition,year),dict(competition=competition,calendar_year=year,expected_matches=None,
            indexed_fixtures=None,scorecard_matches=0,delivery_matches=0,reference=None))
        row["scorecard_matches"]=n
    for name in {k[0] for k in coverage}:
        for y in ("2024","2025","2026"):
            coverage.setdefault((name,y),dict(competition=name,calendar_year=y,expected_matches=None,
                indexed_fixtures=None,scorecard_matches=0,delivery_matches=0,reference=None))
    cov=list(dict(row,status="PARTIAL" if row["scorecard_matches"] or row["delivery_matches"] else
                  "NEEDS VERIFICATION" if row["indexed_fixtures"] and int(row["indexed_fixtures"]) else "SOURCE UNAVAILABLE")
             for _,row in sorted(coverage.items()))
    csv_out(root,"cricfield_competition_coverage",cov,list(cov[0]))
    assert db.execute("PRAGMA integrity_check").fetchone()[0]=="ok"
    assert not db.execute("PRAGMA foreign_key_check").fetchall()
    stats={name:db.execute(f"SELECT count(*) FROM {name}").fetchone()[0] for name in
           ("players","matches","deliveries","scout_domestic_match","scout_recent_form")}
    active=db.execute("SELECT count(DISTINCT player_key) FROM match_players").fetchone()[0]
    inventory=json.loads((root/"warehouse_inventory.json").read_text())
    report=f"""# Scout Lab reconciliation

Original warehouse: {inventory['original']}.
IPL release: {inventory['ipl']}. Matched IPL fixture IDs: {inventory['iplOverlap']}.
Expanded export: {inventory['expanded']}. Overlaps preserved: {inventory['expandedOverlap']}.
Reconciled: {stats}. New delivery-backed matches: {inventory['newMatches']}.
Roster-linked players: {active}. Registry entries without a match roster link: {stats['players']-active}.
Scouting window: {WINDOW_START} to {AS_OF}. Master player-match rows: {len(master)}.
Recent-form players: {len({r['cricfield_player_id'] for r in forms})}.
Domestic scorecard identities are pending verification. None were silently merged.
Auction eligibility and contract statuses retain source values, including unknowns.
Integrity, foreign keys and unique canonical player-match keys passed.
"""
    (root/"cricfield_data_quality_report.md").write_text(report,encoding="utf-8")
    (root/"cricfield_ingestion_report.md").write_text(
        "# Ingestion coverage\n\nThe reconciler reread verified Cricsheet JSON entries from the local archive. "
        "The domestic scorecards remain queryable as source evidence. Fixture coverage and unresolved identities "
        "are in the CSVs. Full 2024–26 domestic discovery, scorecard ingestion and source-player mapping remain incomplete. "
        "No private RR data was imported. The master uses the verified expanded performance export with IDs remapped "
        "to the staged warehouse. Recent form reflects that export's available matches.\n",encoding="utf-8")
    workbook(root,[("Master","cricfield_scouting_master_2024_2026.csv"),("Coverage","cricfield_competition_coverage.csv"),
                   ("Recent Form","cricfield_player_recent_form.csv")])
    db.close()
    print(report)


if __name__=="__main__":
    main()

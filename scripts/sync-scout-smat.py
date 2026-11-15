"""Refresh domestic scouting staging from archived match data."""
import argparse
from datetime import date, datetime, timezone, timedelta
import json
import os
from pathlib import Path
import subprocess
import sys
from tempfile import NamedTemporaryFile, TemporaryDirectory
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
import zipfile


ARCHIVE = "https://cricsheet.org/downloads/sma_json.zip"
MAX_BYTES = 64 * 1024 * 1024


def refresh_archive(cache, *, offline=False):
    cache.mkdir(parents=True, exist_ok=True)
    archive = cache / "sma_json.zip"
    metadata = cache / "sma-http.json"
    if offline:
        if not zipfile.is_zipfile(archive):
            raise ValueError("No usable SMAT archive in cache")
        return archive, "offline cache"

    headers = {}
    if zipfile.is_zipfile(archive) and metadata.is_file():
        headers = json.loads(metadata.read_text(encoding="utf-8"))
    try:
        with urlopen(Request(ARCHIVE, headers=headers), timeout=30) as response:
            data = response.read(MAX_BYTES + 1)
            validators = {request: response.headers[source] for request, source in (
                ("If-None-Match", "ETag"), ("If-Modified-Since", "Last-Modified")
            ) if response.headers.get(source)}
    except HTTPError as exc:
        if exc.code == 304 and zipfile.is_zipfile(archive):
            return archive, "unchanged cache"
        if exc.code < 500 or not zipfile.is_zipfile(archive):
            raise
        return archive, f"stale cache (HTTP {exc.code})"
    except (URLError, TimeoutError):
        if not zipfile.is_zipfile(archive):
            raise
        return archive, "stale cache (network unavailable)"

    if len(data) > MAX_BYTES:
        raise ValueError("Cricsheet download exceeds 64 MiB")
    with NamedTemporaryFile(dir=cache, delete=False) as handle:
        pending = Path(handle.name)
        handle.write(data)
    try:
        with zipfile.ZipFile(pending) as z:
            if not any(Path(entry.filename).stem.isdecimal() and entry.filename.endswith(".json")
                       for entry in z.infolist()):
                raise ValueError("Cricsheet archive contains no match files")
        os.replace(pending, archive)
        metadata.write_text(json.dumps(validators), encoding="utf-8")
    finally:
        pending.unlink(missing_ok=True)
    return archive, "downloaded archive"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--archive", type=Path, help="Use a local Cricsheet ZIP")
    parser.add_argument("--scorecards-only", action="store_true", help="Import authorized JSONL scorecards without a Cricsheet ZIP")
    parser.add_argument("--cache-dir", type=Path, default=Path.home() / ".cache" / "cricfield" / "scout")
    parser.add_argument("--offline", action="store_true", help="Use the cached ZIP without contacting Cricsheet")
    parser.add_argument("--fixtures", type=Path, nargs="*", default=[])
    parser.add_argument("--scorecards", type=Path, nargs="*", default=[])
    parser.add_argument("--identity-map", type=Path)
    parser.add_argument("--through", type=date.fromisoformat,
                        default=datetime.now(timezone(timedelta(hours=5, minutes=30))).date())
    args = parser.parse_args()
    if not args.baseline.is_file():
        parser.error("Baseline database must exist")
    if args.output.exists():
        parser.error("Choose a new output directory")
    if args.scorecards_only and (not args.scorecards or args.archive or args.offline):
        parser.error("--scorecards-only requires --scorecards and excludes ZIP options")
    scripts = Path(__file__).resolve().parent
    command = [sys.executable, str(scripts / "build-domestic-scouting.py"),
               "--baseline", str(args.baseline), "--output", str(args.output),
               "--through", args.through.isoformat()]
    if args.scorecards:
        command.extend(["--scorecards", *map(str, args.scorecards)])
    if args.identity_map:
        command.extend(["--identity-map", str(args.identity_map)])
    if args.scorecards_only:
        subprocess.run([*command, "--fixtures", *map(str, args.fixtures)], check=True)
        return
    with TemporaryDirectory() as tmp:
        temp = Path(tmp)
        archive, source = (args.archive, "local archive") if args.archive else refresh_archive(
            args.cache_dir, offline=args.offline)
        print(f"SMAT source: {source}", flush=True)

        rows = []
        with zipfile.ZipFile(archive) as z:
            for entry in z.infolist():
                mid = Path(entry.filename).stem
                if not entry.filename.endswith(".json") or not mid.isdecimal():
                    continue
                info = json.loads(z.read(entry))["info"]
                if (info["gender"] != "male" or info["match_type"] != "T20" or
                        info.get("event", {}).get("name") != "Syed Mushtaq Ali Trophy"):
                    continue
                first, last = min(info["dates"]), max(info["dates"])
                if first < "2024-01-01" or last > args.through.isoformat():
                    continue
                outcome = info.get("outcome", {})
                winner = outcome.get("winner")
                status = "win" if winner else {
                    "tie": "tie", "no result": "no_result", "abandoned": "abandoned",
                }.get(outcome.get("result"), "unknown")
                rows.append(dict(provider="Cricsheet", source_match_id=mid,
                                 competition_code="smat", season=str(info["season"]),
                                 format="T20", start_date=first, end_date=last,
                                 team1=info["teams"][0], team2=info["teams"][1],
                                 status=status, winner=winner, source_url=ARCHIVE))
        if not rows:
            raise ValueError("Archive contained no SMAT matches in scope")
        manifest = temp / "smat-fixtures.jsonl"
        manifest.write_text("".join(json.dumps(row) + "\n" for row in rows), encoding="utf-8")
        subprocess.run([*command, "--fixtures", str(manifest), *map(str, args.fixtures),
                        "--cricsheet", str(archive)], check=True)
        print(f"SMAT archive candidates: {len(rows)}. Latest match date: {max(r['end_date'] for r in rows)}")


if __name__ == "__main__":
    main()

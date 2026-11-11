import { platform } from "../platform/store";

// Separate from the read-only cricket warehouse. Persist private room state in
// the existing platform database so refreshes and API restarts keep the match.
function db() {
  const d = platform().db;
  d.exec(`CREATE TABLE IF NOT EXISTS arcade_live_states (
    kind TEXT NOT NULL, code TEXT NOT NULL, state TEXT NOT NULL,
    expires_at INTEGER NOT NULL, PRIMARY KEY(kind, code)
  )`);
  return d;
}

export function loadLiveState<T>(kind: string, code: string): T | undefined {
  const row = db()
    .prepare(
      "SELECT state FROM arcade_live_states WHERE kind=? AND code=? AND expires_at>?",
    )
    .get(kind, code, Date.now()) as { state: string } | undefined;
  return row ? (JSON.parse(row.state) as T) : undefined;
}

export function saveLiveState(
  kind: string,
  code: string,
  state: unknown,
  expiresAt: number,
) {
  db()
    .prepare(
      `INSERT INTO arcade_live_states VALUES(?,?,?,?)
    ON CONFLICT(kind,code) DO UPDATE SET state=excluded.state, expires_at=excluded.expires_at`,
    )
    .run(kind, code, JSON.stringify(state), expiresAt);
}

export function pruneLiveStates() {
  db()
    .prepare("DELETE FROM arcade_live_states WHERE expires_at<=?")
    .run(Date.now());
}

export function deleteLiveState(kind: string, code: string) {
  db()
    .prepare("DELETE FROM arcade_live_states WHERE kind=? AND code=?")
    .run(kind, code);
}

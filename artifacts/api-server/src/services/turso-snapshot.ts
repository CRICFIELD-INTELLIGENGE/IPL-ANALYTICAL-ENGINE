import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { DatabaseSync } from "node:sqlite";

const maxSnapshotBytes = 220 * 1024 * 1024;

export async function loadWarehouseSnapshot(
  url: string,
  token: string,
  filename: string,
  requiredTables: readonly string[],
): Promise<string> {
  const origin = new URL(url.replace(/^libsql:\/\//, "https://"));
  if (origin.protocol !== "https:" || !origin.hostname.endsWith(".turso.io")) {
    throw new Error("Invalid Turso origin");
  }

  const signal = AbortSignal.timeout(45_000);
  const request = (path: string) => fetch(new URL(path, origin), {
    headers: { Authorization: `Bearer ${token}` },
    redirect: "error",
    signal,
  });

  const info = await request("/info");
  if (!info.ok) throw new Error("Turso snapshot metadata unavailable");
  const metadata = await info.json();
  const generation = metadata.current_generation;
  if (!Number.isSafeInteger(generation) || generation < 0 || metadata.db_type === "tursodb") {
    throw new Error("Unsupported warehouse snapshot");
  }

  const dir = await mkdtemp(join(tmpdir(), "cricfield-"));
  const file = join(dir, filename);
  try {
    const snapshot = await request(`/export/${generation}`);
    if (!snapshot.ok || !snapshot.body) throw new Error("Turso snapshot unavailable");
    let bytes = 0;
    await pipeline(
      Readable.fromWeb(snapshot.body as Parameters<typeof Readable.fromWeb>[0]),
      new Transform({
        transform(chunk, _encoding, done) {
          bytes += chunk.length;
          if (bytes > maxSnapshotBytes) return done(new Error("Warehouse exceeds the snapshot size limit"));
          done(null, chunk);
        },
      }),
      createWriteStream(file, { flags: "wx", mode: 0o600 }),
      { signal },
    );

    // These previews use sealed, imported databases. Refuse exports that require WAL replay.
    const wal = await request(`/sync/${generation}/1/2`);
    if (wal.status === 200) {
      const reader = wal.body?.getReader();
      if (reader) {
        const first = await reader.read();
        await reader.cancel();
        if (!first.done) throw new Error("Warehouse has pending WAL frames");
      }
    } else if (wal.status === 400) {
      await wal.body?.cancel();
    } else {
      await wal.body?.cancel();
      throw new Error("Turso WAL status could not be verified");
    }

    const db = new DatabaseSync(file, { readOnly: true });
    try {
      const check = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?");
      if (!requiredTables.every(table => check.get(table))) throw new Error("Warehouse schema is incomplete");
    } finally {
      db.close();
    }
    return file;
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    throw error;
  }
}

// Global data engine — reading Cricsheet archives in place.
//
// Decompression is done by fflate. fflate does not check CRC-32s, so the
// checksum table is read from the zip's central directory here and every
// inflated entry is compared against it with node:zlib's crc32.

import { unzipSync } from "fflate";
import { crc32 } from "node:zlib";

export interface ZipEntry {
  name: string;
  crc32: number;
  compressedSize: number;
  size: number;
}

const EOCD = 0x06054b50;
const CDH = 0x02014b50;

/** Lists the archive's entries from its central directory (names, sizes, CRC-32). */
export function listEntries(buf: Uint8Array): ZipEntry[] {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) {
    if (view.getUint32(i, true) === EOCD) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a zip archive: end of central directory not found");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries: ZipEntry[] = [];
  for (let k = 0; k < count; k++) {
    if (view.getUint32(p, true) !== CDH) throw new Error(`corrupt central directory at entry ${k}`);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    entries.push({
      crc32: view.getUint32(p + 16, true),
      compressedSize: view.getUint32(p + 20, true),
      size: view.getUint32(p + 24, true),
      name: decoder.decode(buf.subarray(p + 46, p + 46 + nameLen)),
    });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/**
 * Inflates the named entries (in batches, to bound memory) and yields each
 * with its bytes, after checking size and CRC-32 against the central directory.
 */
export function* readEntries(buf: Uint8Array, names: string[], batchSize = 100): Generator<{ entry: ZipEntry; data: Uint8Array }> {
  const byName = new Map(listEntries(buf).map((e) => [e.name, e]));
  for (let i = 0; i < names.length; i += batchSize) {
    const want = new Set(names.slice(i, i + batchSize));
    const files = unzipSync(buf, { filter: (f) => want.has(f.name) });
    for (const name of want) {
      const entry = byName.get(name);
      const data = files[name];
      if (!entry || !data) throw new Error(`zip entry missing: ${name}`);
      if (data.length !== entry.size) throw new Error(`size mismatch in ${name}: ${data.length} != ${entry.size}`);
      if (crc32(data) >>> 0 !== entry.crc32 >>> 0) throw new Error(`CRC-32 mismatch in ${name}`);
      yield { entry, data };
    }
  }
}

/** Full integrity check: every entry inflates and matches its CRC-32. */
export function verifyArchive(buf: Uint8Array): { entries: number; jsonEntries: number; uncompressedBytes: number } {
  const entries = listEntries(buf);
  let uncompressedBytes = 0;
  for (const { data } of readEntries(buf, entries.map((e) => e.name))) uncompressedBytes += data.length;
  return { entries: entries.length, jsonEntries: entries.filter((e) => e.name.endsWith(".json")).length, uncompressedBytes };
}

// Binary layout shared by the build script and the engine. u16 columns first so every view is aligned.
export const COLUMNS = [
  ["match", "u16"], ["batter", "u16"], ["bowler", "u16"], ["runsBefore", "u16"], ["target", "u16"],
  ["inn", "u8"], ["over", "u8"], ["ballsLeft", "u8"], ["wkts", "u8"], ["pos", "u8"],
  ["runsBat", "u8"], ["conceded", "u8"], ["flags", "u8"],
] as const;
export type ColumnName = (typeof COLUMNS)[number][0];
export const FLAG = { legal: 1, faced: 2, strikerOut: 4, bowlerWkt: 8 } as const;

export type Balls = Record<ColumnName, Uint16Array | Uint8Array> & { n: number };

export function decodeBalls(buf: ArrayBuffer, n: number): Balls {
  const out = { n } as Balls;
  let off = 0;
  for (const [name, type] of COLUMNS) {
    if (type === "u16") { out[name] = new Uint16Array(buf, off, n); off += 2 * n; }
    else { out[name] = new Uint8Array(buf, off, n); off += n; }
  }
  if (off !== buf.byteLength) throw new Error(`pressure-intel: expected ${off} bytes, got ${buf.byteLength}`);
  return out;
}

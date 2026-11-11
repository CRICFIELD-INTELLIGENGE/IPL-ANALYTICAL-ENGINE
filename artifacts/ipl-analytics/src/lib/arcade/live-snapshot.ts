export interface LiveSnapshot {
  revision: number;
  serverNow: number;
}
/** A delayed poll must never roll a committed move back on screen. */
export function acceptsLiveSnapshot(
  current: LiveSnapshot | null,
  incoming: LiveSnapshot,
): boolean {
  return (
    !current ||
    incoming.revision > current.revision ||
    (incoming.revision === current.revision &&
      incoming.serverNow >= current.serverNow)
  );
}
export function serverClockOffset(
  serverNow: number,
  sentAt: number,
  receivedAt: number,
): number {
  return serverNow - (sentAt + receivedAt) / 2;
}

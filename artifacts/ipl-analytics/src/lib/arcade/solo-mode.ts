import { useEffect, useState } from "react";
import type { GameId } from "@workspace/arcade-rules";
export const SOLO_MODE_EVENT = "cricfield:arcade-solo-mode";
export function useArcadeSoloActive(game: GameId) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const onMode = (event: Event) => {
      const detail = (event as CustomEvent<{ game: GameId; active: boolean }>)
        .detail;
      if (detail.game === game) setActive(detail.active);
    };
    window.addEventListener(SOLO_MODE_EVENT, onMode);
    return () => window.removeEventListener(SOLO_MODE_EVENT, onMode);
  }, [game]);
  return active;
}

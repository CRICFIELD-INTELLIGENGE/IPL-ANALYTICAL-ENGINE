import { useState, useEffect, useCallback } from "react";
import type { ScoutRating } from "@/lib/scout-api";

const STORAGE_KEY = "cricfield_scout_shortlist_v1";
const SHORTLIST_EVENT = "cricfield:scout-shortlist";

export function getStoredShortlist(): ScoutRating[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to parse scout shortlist from localStorage", err);
    return [];
  }
}

export function saveStoredShortlist(list: ScoutRating[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SHORTLIST_EVENT));
  } catch (err) {
    console.error("Failed to save scout shortlist to localStorage", err);
  }
}

export function useScoutShortlist() {
  const [shortlist, setShortlist] = useState<ScoutRating[]>(() => getStoredShortlist());

  useEffect(() => {
    const sync = () => setShortlist(getStoredShortlist());
    window.addEventListener(SHORTLIST_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SHORTLIST_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggleShortlist = useCallback((player: ScoutRating) => {
    const prev = getStoredShortlist();
    const exists = prev.some((p) => p.cricsheet_id === player.cricsheet_id);
    if (exists) {
      const next = prev.filter((p) => p.cricsheet_id !== player.cricsheet_id);
      setShortlist(next);
      saveStoredShortlist(next);
      return;
    }
    const next = [...prev, player];
    setShortlist(next);
    saveStoredShortlist(next);
  }, []);

  const isShortlisted = useCallback(
    (cricsheet_id: string) => shortlist.some((p) => p.cricsheet_id === cricsheet_id),
    [shortlist]
  );

  const clearShortlist = useCallback(() => {
    setShortlist([]);
    saveStoredShortlist([]);
  }, []);

  return {
    shortlist,
    toggleShortlist,
    isShortlisted,
    clearShortlist,
  };
}

import { defaultAnalyticsFilters, useAnalyticsFilterStore } from "@/lib/store";
import { getStoredShortlist, saveStoredShortlist } from "@/lib/scout-shortlist";
import { getSupabase } from "@/lib/supabase";
export type SavedFeature = "scout" | "stats" | "arcade";
export function captureFeature(feature: SavedFeature): Record<string, unknown> {
  if (feature === "scout") return { version: 1, shortlist: getStoredShortlist() };
  if (feature === "stats") return { version: 1, filters: useAnalyticsFilterStore.getState().filters };
  return { version: 1, highScore: Number(localStorage.getItem("cricfield_hl_high_score") ?? 0), recent: JSON.parse(localStorage.getItem("cricfield_arcade_recent") ?? "[]") };
}
export function restoreFeature(feature: SavedFeature, value: Record<string, unknown>) {
  if (value.version !== 1) throw new Error("Unsupported save version.");
  if (feature === "scout") {
    if (!Array.isArray(value.shortlist) || !value.shortlist.every(item => item && typeof item.cricsheet_id === "string")) throw new Error("Invalid Scout save.");
    saveStoredShortlist(value.shortlist);
  } else if (feature === "stats") {
    const filters = value.filters;
    if (!filters || typeof filters !== "object") throw new Error("Invalid Stats save.");
    const valid = { ...defaultAnalyticsFilters };
    for (const key of Object.keys(valid) as Array<keyof typeof valid>) {
      const item = (filters as Record<string, unknown>)[key];
      if (typeof item !== "string" || item.length > 200) throw new Error("Invalid Stats filter.");
      (valid as Record<string, string>)[key] = item;
    }
    useAnalyticsFilterStore.setState({ filters: valid });
  } else {
    if (!Number.isSafeInteger(value.highScore) || Number(value.highScore) < 0 || !Array.isArray(value.recent) || !value.recent.every(item => typeof item === "string")) throw new Error("Invalid Arcade save.");
    localStorage.setItem("cricfield_hl_high_score", String(value.highScore));
    localStorage.setItem("cricfield_arcade_recent", JSON.stringify(value.recent.slice(0,3)));
  }
}
export async function saveFeature(feature: SavedFeature) {
  const api = getSupabase();
  const { data, error: authError } = await api.auth.getUser();
  if (authError || !data.user) throw new Error("Sign in to save to your account.");
  const { error } = await api.from("saved_feature_data").upsert({ user_id: data.user.id, feature, payload: captureFeature(feature), updated_at: new Date().toISOString() });
  if (error) throw new Error("Could not save. Your browser data is unchanged; please retry.");
}

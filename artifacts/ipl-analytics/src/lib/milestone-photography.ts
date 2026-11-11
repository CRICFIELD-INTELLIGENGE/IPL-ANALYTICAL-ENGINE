import { type FranchiseMilestone } from "./franchise-milestones";
import type { TeamTheme } from "./team-context";
import eventPhotos from "@/data/milestone-event-photos.json";

export type EventPhoto = (typeof eventPhotos)[number];
export interface MilestonePhoto { eventPhoto: EventPhoto; exactEvent: boolean }

/** Only visually reviewed, team-specific photographs are eligible. Being opponents
 * in the same final never grants a team access to the winner's celebration. */
export function milestonePhotography(team: TeamTheme, moments: FranchiseMilestone[]): Map<string, MilestonePhoto[]> {
  const result = new Map<string, MilestonePhoto[]>();
  for (const moment of moments) {
    const frames = eventPhotos.filter(photo => {
      if (!photo.teams.includes(team.id) || photo.season !== moment.season) return false;
      if (moment.id !== "most-season-wins" && photo.matchDate !== moment.match?.date.slice(0, 10)) return false;
      if (photo.depiction === "championship" && moment.kind === "finalist") return false;
      if (photo.occasion === "final") return moment.id === `final-${photo.season}` || moment.id === "most-season-wins";
      if (moment.id === photo.occasion) return true;
      return photo.occasion === "debut" && moment.id === "first-win" && Boolean(moment.match && moments.find(m => m.id === "debut")?.match?.id === moment.match.id);
    }).sort((a, b) => Number(a.presentation !== "landscape") - Number(b.presentation !== "landscape"));
    if (frames.length) result.set(moment.id, frames.map(eventPhoto => ({ eventPhoto, exactEvent: moment.id !== "most-season-wins" })));
  }
  return result;
}

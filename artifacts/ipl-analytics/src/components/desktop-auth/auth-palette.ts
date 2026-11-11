import type { CSSProperties } from 'react';
import { FRANCHISE_THEMES } from '@/lib/franchiseColors';
import { TEAM_REGISTRY, type TeamCode } from '@/lib/team-context';
/** Keep the local logo, primary rival and CTA on one canonical franchise color. */
export function authPalette(selectedTeam: TeamCode | null) {
 const team=selectedTeam??'CSK';
 const rivalry: Partial<Record<TeamCode,TeamCode>>={CSK:'RCB',RCB:'CSK',MI:'CSK'};
 const rival=rivalry[team]??TEAM_REGISTRY[team].archRival;
 const primary=FRANCHISE_THEMES[team.toLowerCase()], secondary=FRANCHISE_THEMES[rival.toLowerCase()];
 const channels=primary.primary.slice(1).match(/../g)!.map(h=>{const c=parseInt(h,16)/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});
 const luminance=.2126*channels[0]+.7152*channels[1]+.0722*channels[2];
 const ink=(luminance+.05)/.05>1.05/(luminance+.05)?'#000000':'#ffffff';
 return {team,rival,primary:primary.primary,secondary:secondary.primary,style:{'--auth-primary':primary.primary,'--auth-rival':secondary.primary,'--auth-primary-ink':ink,'--accent-primary':primary.primary,'--accent-secondary':primary.secondary} as CSSProperties};
}

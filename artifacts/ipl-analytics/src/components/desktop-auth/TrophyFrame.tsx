import {useTeamTheme,TEAM_REGISTRY} from '@/lib/team-context';
import {authPalette} from './auth-palette';
/** Blank artwork and handle ribbons; the form itself is live HTML. */
export function TrophyFrame(){const {selectedTeam}=useTeamTheme();const {team,rival}=authPalette(selectedTeam);return <div className="auth-rendered-trophy" aria-hidden="true"><img className="auth-trophy-frame-art" src="/branding/auth/trophy-frame-v1.png" alt=""/><div className="auth-trophy-ribbon auth-ribbon-primary"><img src={TEAM_REGISTRY[team].logoImg} alt=""/><span>{team}</span></div><div className="auth-trophy-ribbon auth-ribbon-rival"><img src={TEAM_REGISTRY[rival].logoImg} alt=""/><span>{rival}</span></div></div>;}
